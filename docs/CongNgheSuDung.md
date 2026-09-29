# 📋 TOÀN BỘ NGÔN NGỮ & CÔNG NGHỆ TRONG DỰ ÁN

**Dự án:** Hệ thống thi cử trực tuyến với giám sát AI  
**Phiên bản tài liệu:** 1.0  
**Ngày cập nhật:** 07/08/2026

---

## MỤC LỤC

1. [Backend](#1-backend)
2. [Frontend](#2-frontend)
3. [Cơ sở dữ liệu](#3-cơ-sở-dữ-liệu)
4. [Hạ tầng & DevOps](#4-hạ-tầng--devops)
5. [AI Proctoring](#5-ai-proctoring)
6. [Tổng kết theo ngôn ngữ](#6-tổng-kết-theo-ngôn-ngữ)
7. [Sơ đồ công nghệ theo tầng](#7-sơ-đồ-công-nghệ-theo-tầng)
8. [Lưu ý quan trọng](#8-lưu-ý-quan-trọng)

---

## 1. BACKEND

| Thành phần             | Công nghệ            | Phiên bản | Mục đích                                        |
| :--------------------- | :------------------- | :-------- | :---------------------------------------------- |
| **Ngôn ngữ**           | Python               | 3.11+     | Ngôn ngữ chính cho tất cả backend services      |
| **Web Framework**      | FastAPI              | 0.104.1+  | Xây dựng REST API và WebSocket, tự động OpenAPI |
| **ASGI Server**        | Uvicorn              | 0.24.0+   | Server chạy FastAPI (async)                     |
| **ORM**                | SQLAlchemy           | 2.0.23+   | ORM cho PostgreSQL (async)                      |
| **Database Migration** | Alembic              | 1.12.1+   | Quản lý schema migration cho PostgreSQL         |
| **Database Driver**    | asyncpg              | 0.29.0+   | Driver async cho PostgreSQL                     |
| **NoSQL Driver**       | Motor                | 3.3.0+    | Driver async cho MongoDB                        |
| **Validation**         | Pydantic             | 2.5.0+    | Data validation và serialization                |
| **Settings**           | Pydantic Settings    | 2.0.3+    | Quản lý cấu hình từ .env                        |
| **Authentication**     | python-jose          | 3.3.0+    | Tạo và xác thực JWT                             |
| **Password Hashing**   | Passlib + bcrypt     | 1.7.4+    | Hash mật khẩu                                   |
| **Async Tasks**        | Celery               | 5.3.4+    | Xử lý tác vụ nặng bất đồng bộ                   |
| **Async Task Broker**  | Redis                | 7+        | Celery dùng Redis làm broker (không dùng RabbitMQ) |
| **HTTP Client**        | httpx                | 0.25.0+   | Gọi API giữa các service                        |
| **Testing**            | pytest               | 7.4.0+    | Unit testing                                    |
| **Testing Async**      | pytest-asyncio       | 0.21.0+   | Hỗ trợ async test                               |
| **Code Quality**       | Black, isort, flake8 | -         | Format và lint code                             |

### 1.1. File cấu hình Backend

**`requirements.txt`**

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
asyncpg==0.29.0
motor==3.3.0
python-dotenv==1.0.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
pydantic-settings==2.0.3
pydantic[email]==2.5.0
celery==5.3.4
httpx==0.25.0
pytest==7.4.0
pytest-asyncio==0.21.0
pytest-cov==4.1.0
```

**`pyproject.toml`** (cho code quality)

```toml
[tool.black]
line-length = 100
target-version = ['py311']

[tool.isort]
profile = "black"
line_length = 100

[tool.flake8]
max-line-length = 100
extend-ignore = ["E203", "W503"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

---

## 2. FRONTEND

| Thành phần           | Công nghệ          | Phiên bản | Mục đích                                   |
| :------------------- | :----------------- | :-------- | :----------------------------------------- |
| **Ngôn ngữ**         | TypeScript         | 5.0+      | JavaScript có kiểu tĩnh                    |
| **UI Framework**     | React              | 18.2+     | Xây dựng giao diện người dùng              |
| **Build Tool**       | Vite               | 5.0+      | Bundle và dev server nhanh                 |
| **UI Components**    | Material-UI (MUI)  | 5.14.18+  | Component library rich aesthetics          |
| **CSS-in-JS**        | Emotion            | 11.11.0+  | Styling cho MUI                            |
| **Routing**          | React Router DOM   | 6.20.0+   | Điều hướng trang                           |
| **HTTP Client**      | Axios              | 1.6.2+    | Gọi API                                    |
| **Form Management**  | React Hook Form    | 7.47.0+   | Quản lý form                               |
| **Form Validation**  | Zod                | 3.22.4+   | Schema validation cho form                 |
| **Resolver**         | Hookform Resolvers | 3.3.2+    | Kết nối Zod với React Hook Form            |
| **State Management** | Zustand            | 4.4.0+    | Quản lý state toàn cục (nhẹ hơn Redux)     |
| **WebSocket Client** | Socket.IO Client   | 4.5+      | Kết nối WebSocket real-time                |
| **Proctoring AI**    | @timadey/proctor   | -         | Giám sát thi cử AI (camera, audio, events) |
| **Video Processing** | MediaPipe          | -         | Face detection, gaze detection             |
| **Testing**          | Vitest             | 1.0+      | Unit testing                               |
| **Testing React**    | Testing Library    | 14.0+     | Testing component React                    |
| **Code Quality**     | ESLint, Prettier   | -         | Lint và format code                        |
| **Husky**            | Husky              | 8.0+      | Pre-commit hooks                           |

### 2.1. File cấu hình Frontend

**`package.json`** (dependencies)

```json
{
  "dependencies": {
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "@hookform/resolvers": "^3.3.2",
    "@mui/icons-material": "^5.14.18",
    "@mui/material": "^5.14.18",
    "@timadey/proctor": "^1.0.0",
    "axios": "^1.6.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.47.0",
    "react-router-dom": "^6.20.0",
    "socket.io-client": "^4.5.4",
    "zod": "^3.22.4",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@typescript-eslint/eslint-plugin": "^6.10.0",
    "@typescript-eslint/parser": "^6.10.0",
    "@vitejs/plugin-react": "^4.1.1",
    "eslint": "^8.53.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.4",
    "husky": "^8.0.3",
    "lint-staged": "^15.1.0",
    "prettier": "^3.1.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

**`.eslintrc.json`**

```json
{
  "root": true,
  "env": { "browser": true, "es2020": true },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["react-refresh"],
  "rules": {
    "react-refresh/only-export-components": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": "warn"
  }
}
```

**`.prettierrc`**

```json
{
  "singleQuote": true,
  "tabWidth": 2,
  "semi": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## 3. CƠ SỞ DỮ LIỆU

| Thành phần          | Công nghệ  | Phiên bản | Mục đích                                     |
| :------------------ | :--------- | :-------- | :------------------------------------------- |
| **Relational DB**   | PostgreSQL | 15+       | Lưu users, exams, results, violations        |
| **NoSQL DB**        | MongoDB    | 6+        | Lưu questions (cấu trúc linh hoạt), sessions |
| **In-memory Cache** | Redis      | 7+        | Cache, Pub/Sub, session real-time            |

### 3.1. Cấu hình kết nối

**PostgreSQL (SQLAlchemy URL)**

```
postgresql+asyncpg://postgres:postgres@postgres:5432/exam_db
```

**MongoDB (Motor URL)**

```
mongodb://mongodb:27017
```

**Redis (Redis URL)**

```
redis://redis:6379
```

### 3.2. Database Schema

**PostgreSQL Tables:**

- `users` - Auth và profile
- `exams` - Kỳ thi
- `results` - Kết quả thi
- `violations` - Sự kiện vi phạm (proctoring)
- `exam_assignments` - Phân công giáo viên
- `audit_logs` - Nhật ký hoạt động

**MongoDB Collections:**

- `questions` - Ngân hàng câu hỏi (cấu trúc linh hoạt)
- `exam_sessions` - Phiên làm bài (trạng thái real-time)

---

## 4. HẠ TẦNG & DEVOPS

| Thành phần           | Công nghệ            | Phiên bản | Mục đích                               |
| :------------------- | :------------------- | :-------- | :------------------------------------- |
| **Containerization** | Docker               | 24+       | Đóng gói ứng dụng                      |
| **Orchestration**    | Docker Compose       | 2.23+     | Quản lý multi-container                |
| **API Gateway**      | Nginx                | 1.25+     | Load balancing, routing, reverse proxy |
| **CI/CD**            | GitHub Actions       | -         | Tự động test, build, deploy            |
| **Version Control**  | Git                  | -         | Quản lý mã nguồn                       |
| **Monitoring**       | Prometheus + Grafana | (future)  | Giám sát hệ thống                      |
| **Logging**          | ELK Stack            | (future)  | Log tập trung                          |

### 4.1. File cấu hình DevOps

**`docker-compose.yml`** (structure)

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:15-alpine
    container_name: exam-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - exam_network

  mongodb:
    image: mongo:6
    container_name: exam-mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - exam_network

  redis:
    image: redis:7-alpine
    container_name: exam-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - exam_network

  auth_service:
    build: ./backend/auth_service
    container_name: exam-auth-service
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      JWT_SECRET: ${JWT_SECRET}
      JWT_ALGORITHM: ${JWT_ALGORITHM}
      ACCESS_TOKEN_EXPIRE_MINUTES: ${ACCESS_TOKEN_EXPIRE_MINUTES}
      REFRESH_TOKEN_EXPIRE_DAYS: ${REFRESH_TOKEN_EXPIRE_DAYS}
      CORS_ORIGINS: ${CORS_ORIGINS}
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend/auth_service:/app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - exam_network

  nginx:
    image: nginx:alpine
    container_name: exam-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      auth_service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - exam_network

networks:
  exam_network:
    driver: bridge

volumes:
  postgres_data:
  mongodb_data:
  redis_data:
```

**`.github/workflows/ci.yml`**

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: |
          cd backend/auth_service
          pip install -r requirements.txt
          pip install pytest-cov black isort flake8
      - name: Lint
        run: |
          cd backend/auth_service
          black --check .
          isort --check .
          flake8 .
      - name: Test
        run: |
          cd backend/auth_service
          pytest --cov=. --cov-report=xml
      - uses: codecov/codecov-action@v3
        with:
          file: ./backend/auth_service/coverage.xml

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Lint
        run: |
          cd frontend
          npm run lint
      - name: Test
        run: |
          cd frontend
          npm run test
      - name: Build
        run: |
          cd frontend
          npm run build
```

---

## 5. AI PROCTORING

| Thành phần            | Công nghệ                    | Mục đích                                                  |
| :-------------------- | :--------------------------- | :-------------------------------------------------------- |
| **AI Library**        | @timadey/proctor             | Giám sát AI toàn diện (face, gaze, audio, browser events) |
| **Face Detection**    | MediaPipe (browser)          | Phát hiện khuôn mặt, nhiều khuôn mặt                      |
| **Gaze Detection**    | MediaPipe (browser)          | Phát hiện hướng nhìn                                      |
| **Object Detection**  | YOLO (server-side, optional) | Phát hiện vật thể đáng ngờ                                |
| **WebRTC**            | Built-in browser API         | Stream camera                                             |
| **Audio Monitoring**  | Web Audio API                | Phát hiện nói chuyện, thì thầm                            |
| **Browser Telemetry** | Web APIs                     | Tab switch, focus loss, copy/paste                        |

### 5.1. Cấu hình Proctoring

**`@timadey/proctor` integration**

```typescript
import { ProctoringEngine } from "@timadey/proctor";

const engine = ProctoringEngine.getInstance({
  enableVisualDetection: true,
  enableAudioMonitoring: true,
  enablePatternDetection: true,
  enableBrowserTelemetry: true,
  frameInterval: 5000, // ms
  riskThreshold: 70,
  onEvent: (event) => {
    // Send to Proctoring Service
  },
  onBehavioralPattern: (pattern) => {
    // Handle suspicious pattern
  },
});
```

---

## 6. TỔNG KẾT THEO NGÔN NGỮ

| Ngôn ngữ         | Sử dụng cho                             | Tỷ lệ ước tính |
| :--------------- | :-------------------------------------- | :------------- |
| **Python**       | Backend services (FastAPI, AI services) | 40%            |
| **TypeScript**   | Frontend (React)                        | 35%            |
| **SQL**          | PostgreSQL queries                      | 10%            |
| **YAML**         | Docker Compose, GitHub Actions          | 5%             |
| **Shell Script** | Automation scripts                      | 5%             |
| **HTML/CSS**     | Base web (tối thiểu, MUI xử lý)         | 5%             |

---

## 7. SƠ ĐỒ CÔNG NGHỆ THEO TẦNG

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ React 18 + TypeScript 5 + Vite 5 + MUI 5               │   │
│  │ React Router 6 + Axios + React Hook Form + Zod         │   │
│  │ @timadey/proctor + MediaPipe (AI Proctoring)           │   │
│  │ Socket.IO Client (WebSocket)                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Nginx 1.25 (Reverse Proxy, Load Balancing)             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVICES                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Python 3.11 + FastAPI 0.104 + Uvicorn                  │   │
│  │ SQLAlchemy 2.0 + Alembic + asyncpg                     │   │
│  │ Motor (MongoDB) + Redis Client                         │   │
│  │ Celery + Redis broker (Async Tasks)                     │   │
│  │ Pytest + Pytest-asyncio (Testing)                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASES                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ PostgreSQL 15 (Relational) + MongoDB 6 (NoSQL)         │   │
│  │ Redis 7 (Cache & Pub/Sub)                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. LƯU Ý QUAN TRỌNG

| Công nghệ                | Vai trò đặc biệt                                         |
| :----------------------- | :------------------------------------------------------- |
| **FastAPI**              | Xương sống của backend, cung cấp OpenAPI docs tự động    |
| **TypeScript**           | Đảm bảo type safety cho toàn bộ frontend                 |
| **MUI**                  | Đảm bảo "Rich Aesthetics" - giao diện đẹp, chuyên nghiệp |
| **@timadey/proctor**     | Trái tim của AI proctoring, xử lý ngay trên trình duyệt  |
| **Docker**               | Đảm bảo tính nhất quán giữa các môi trường               |
| **PostgreSQL + MongoDB** | Hybrid database cho tối ưu từng loại dữ liệu             |
| **Redis**                | Bộ nhớ đệm và Pub/Sub cho real-time                      |
| **Nginx**                | API Gateway và Load Balancer                             |

---

## 9. PHIÊN BẢN & CẬP NHẬT

| Phiên bản | Ngày       | Thay đổi             |
| :-------- | :--------- | :------------------- |
| 1.0       | 07/08/2026 | Tạo tài liệu lần đầu |

---

**📌 Tài liệu này sẽ được cập nhật khi có thay đổi về công nghệ trong quá trình phát triển.**

---

**© 2026 - Hệ thống thi cử trực tuyến với giám sát AI**
