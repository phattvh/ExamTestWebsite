from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import JWTError

import auth
import config
import models
import schemas
from database import Base, engine, get_db, init_engine
from dependencies import get_current_user, require_roles


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create the engine lazily and provision tables on startup.
    init_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="Auth Service API", version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    query = select(models.User).where(
        (models.User.username == user.username) | (models.User.email == user.email)
    )
    result = await db.execute(query)
    existing_user = result.scalars().first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


@app.post("/login", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    query = select(models.User).where(models.User.username == form_data.username)
    result = await db.execute(query)
    user = result.scalars().first()

    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    access_token = auth.create_access_token(data={"sub": user.username})
    refresh_token = auth.create_refresh_token(data={"sub": user.username})

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@app.post("/refresh", response_model=schemas.Token)
async def refresh_token(body: schemas.RefreshRequest, db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth.decode_token(body.refresh_token, expected_type="refresh")
        username = payload.get("sub")
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(models.User).where(models.User.username == username))
    user = result.scalars().first()
    if user is None or not user.is_active:
        raise credentials_exception

    access_token = auth.create_access_token(data={"sub": user.username})
    new_refresh = auth.create_refresh_token(data={"sub": user.username})
    return {"access_token": access_token, "refresh_token": new_refresh, "token_type": "bearer"}


@app.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.put("/me", response_model=schemas.UserResponse)
async def update_me(
    payload: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    # Self-service updates must never change role/active state directly.
    data.pop("role", None)
    data.pop("is_active", None)

    if "email" in data and data["email"] != current_user.email:
        result = await db.execute(select(models.User).where(models.User.email == data["email"]))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Email already in use")

    for key, value in data.items():
        setattr(current_user, key, value)

    await db.commit()
    await db.refresh(current_user)
    return current_user


# ---- Admin endpoints ----

@app.get("/users", response_model=list[schemas.UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    _: models.User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(models.User).offset(skip).limit(limit))
    return result.scalars().all()


@app.get("/users/{user_id}", response_model=schemas.UserResponse)
async def get_user(
    user_id: int,
    _: models.User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.patch("/users/{user_id}/role", response_model=schemas.UserResponse)
async def update_user_role(
    user_id: int,
    payload: schemas.UserRoleUpdate,
    current_admin: models.User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    if payload.role not in ("admin", "teacher", "student"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if current_admin.id == user_id and payload.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot demote yourself")

    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = payload.role
    await db.commit()
    await db.refresh(user)
    return user


@app.delete("/users/{user_id}", response_model=schemas.MessageResponse)
async def deactivate_user(
    user_id: int,
    current_admin: models.User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    await db.commit()
    return {"message": f"User {user.username} deactivated"}
