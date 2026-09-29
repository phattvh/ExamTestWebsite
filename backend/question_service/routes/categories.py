from fastapi import APIRouter, Depends, HTTPException, status, Query
import crud
import schemas
from dependencies import require_permission

router = APIRouter()

@router.get("/", response_model=schemas.PaginatedCategoryResponse)
async def get_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    total, items = await crud.get_categories(skip=skip, limit=limit)
    return {"total": total, "page": skip // limit + 1 if limit > 0 else 1, "size": limit, "items": items}

@router.post("/", response_model=schemas.CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: schemas.CategoryCreate,
    current_user: dict = Depends(require_permission("question:create"))
):
    category_data = category.model_dump(exclude_unset=True)
    new_c = await crud.create_category(category_data)
    if not new_c:
        raise HTTPException(status_code=400, detail="Failed to create category")
    return new_c

@router.get("/{id}", response_model=schemas.CategoryResponse)
async def get_category(id: str):
    c = await crud.get_category(id)
    if not c:
        raise HTTPException(status_code=404, detail="Category not found")
    return c

@router.put("/{id}", response_model=schemas.CategoryResponse)
async def update_category(
    id: str,
    category: schemas.CategoryCreate, # Using same schema for update for simplicity
    current_user: dict = Depends(require_permission("question:update"))
):
    update_data = category.model_dump(exclude_unset=True)
    c = await crud.update_category(id, update_data)
    if not c:
        raise HTTPException(status_code=404, detail="Category not found or update failed")
    return c

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    id: str,
    current_user: dict = Depends(require_permission("question:delete"))
):
    success = await crud.delete_category(id)
    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
    return None
