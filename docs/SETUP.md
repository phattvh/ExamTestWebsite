# HƯỚNG DẪN CÀI ĐẶT & TRIỂN KHAI HỆ THỐNG CHI TIẾT
> **ExamSystem** — Nền tảng Khảo thí & Giám thị Trực tuyến Chuẩn AI (Microservices Architecture).

---

## 📌 MỤC LỤC

1. [Yêu cầu Hệ thống & Phần mềm](#1-yêu-cầu-hệ-thống--phần-mềm)
2. [Cài đặt Nhanh bằng Docker & Docker Compose (Khuyên dùng ⭐⭐⭐⭐⭐)](#2-cài-đặt-nhanh-bằng-docker--docker-compose-khuyên-dùng-)
   - [Bước 1: Clone mã nguồn từ GitHub](#bước-1-clone-mã-nguồn-từ-github)
   - [Bước 2: Cấu hình Biến môi trường (.env)](#bước-2-cấu-hình-biến-môi-trường-env)
   - [Bước 3: Tạo Chứng chỉ SSL Dev](#bước-3-tạo-chứng-chỉ-ssl-dev)
   - [Bước 4: Khởi động toàn bộ Hệ thống](#bước-4-khởi-động-toàn-bộ-hệ-thống)
   - [Bước 5: Kiểm tra Trạng thái Dịch vụ & Đăng nhập](#bước-5-kiểm-tra-trạng-thái-dịch-vụ--đăng-nhập)
3. [Cài đặt & Khởi chạy Thủ công (Không dùng Docker)](#3-cài-đặt--khởi-chạy-thủ-công-không-dùng-docker)
   - [3.1. Cài đặt 3 Cơ sở Dữ liệu](#31-cài-đặt-3-cơ-sở-dữ-liệu)
   - [3.2. Cấu hình & Chạy từng Backend Service](#32-cấu-hình--chạy-từng-backend-service)
   - [3.3. Cài đặt Nginx API Gateway](#33-cài-đặt-nginx-api-gateway)
   - [3.4. Khởi chạy Frontend React](#34-khởi-chạy-frontend-react)
4. [Chạy Frontend riêng biệt để Phát triển Giao diện](#4-chạy-frontend-riêng-biệt-để-phát-triển-giao-diện)
5. [Cấu hình Model AI Giám sát (MediaPipe & YOLOv8n)](#5-cấu-hình-model-ai-giám-sát-mediapipe--yolov8n)
6. [Lệnh Quản trị & Vận hành Thường dùng (Cheat Sheet)](#6-lệnh-quản-trị--vận-hành-thường-dùng-cheat-sheet)
7. [Khắc phục Sự cố Cài đặt Thường gặp (Troubleshooting)](#7-khắc-phục-sự-cố-cài-đặt-thường-gặp-troubleshooting)

---

## 1. Yêu cầu Hệ thống & Phần mềm

### 1.1. Cấu hình Phần cứng Tối thiểu
* **CPU:** 4 Cores (khuyến nghị 4-8 Cores để chạy mượt 6 microservices và AI Vision).
* **RAM:** Tối thiểu 8 GB (khuyến nghị 16 GB).
* **Dung lượng ổ đĩa:** Tối thiểu 10 GB trống (cho Docker images và Database volumes).

### 1.2. Phần mềm Cần chuẩn bị
| Phần mềm | Phiên bản yêu cầu | Mục đích |
| :--- | :--- | :--- |
| **Git** | 2.30+ | Tải mã nguồn |
| **Docker Desktop** *(Win/Mac)* hoặc **Docker Engine** *(Linux)* | 24.0+ & Compose v2 | Đóng gói và chạy toàn bộ dịch vụ |
| **Node.js** *(Tuỳ chọn)* | 18.x - 22.x LTS | Chỉ cần khi chạy Frontend ngoài Docker |
| **Python** *(Tuỳ chọn)* | 3.11+ | Dùng chạy script sinh SSL hoặc chạy Backend không qua Docker |

---

## 2. Cài đặt Nhanh bằng Docker & Docker Compose (Khuyên dùng ⭐⭐⭐⭐⭐)

Đây là phương pháp chuẩn hoá nhất. Docker sẽ tự động tải các cơ sở dữ liệu, build 6 dịch vụ backend, cấu hình mạng nội bộ và khởi chạy Nginx Gateway chỉ với **1 lệnh duy nhất**.

### Bước 1: Clone mã nguồn từ GitHub
Mở Terminal / PowerShell và chạy:
```bash
git clone https://github.com/CoderIshibuki/ExamTestWebsite.git
cd ExamTestWebsite
```

---

### Bước 2: Cấu hình Biến môi trường (.env)
Tạo file cấu hình từ file mẫu có sẵn:

* Trên **Linux / macOS**:
  ```bash
  cp .env.example .env
  cp frontend/.env.example frontend/.env
  ```
* Trên **Windows PowerShell**:
  ```powershell
  Copy-Item .env.example .env
  Copy-Item frontend/.env.example frontend/.env
  ```

#### Kiểm tra các biến quan trọng trong file `.env`:
Mở file `.env` bằng trình soạn thảo (VS Code / Notepad / Vim):
```ini
# --- BẢO MẬT & JWT ---
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars_long
INTERNAL_SERVICE_TOKEN=your_internal_service_secret_token_here

# --- CƠ SỞ DỮ LIỆU ---
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=exam_system

MONGO_INITDB_ROOT_USERNAME=mongo
MONGO_INITDB_ROOT_PASSWORD=mongo
MONGO_URI=mongodb://mongo:mongo@mongodb:27017

REDIS_HOST=redis
REDIS_PORT=6379

# --- EMAIL (TUỲ CHỌN) ---
# Nếu chưa có SMTP thật, để trống hệ thống sẽ log link reset password ra console
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=no-reply@examsystem.local
```

> ⚠️ **LƯU Ý QUAN TRỌNG VỀ `frontend/.env`:**
> Giá trị mặc định là `VITE_API_URL=/api` — **TUYỆT ĐỐI KHÔNG ĐỔI thành `/api/v1`**, vì code frontend đã tự động gắn tiền tố `/v1/...`. Nếu sửa sẽ gây lỗi 404 toàn bộ hệ thống (`/api/v1/v1/...`).

---

### Bước 3: Tạo Chứng chỉ SSL Dev (HTTPS)
Nginx Gateway yêu cầu chứng chỉ SSL để hỗ trợ giao thức HTTPS và cấp quyền Camera WebRTC trên trình duyệt:

```bash
# Cài đặt thư viện cryptography (nếu máy chưa có)
pip install cryptography

# Chạy script tự động sinh cert nội bộ
python scripts/generate_ssl.py
```
*Script sẽ tự động tạo `nginx/ssl/cert.pem` và `nginx/ssl/key.pem`.*

---

### Bước 4: Khởi động toàn bộ Hệ thống
Chạy lệnh khởi động Docker Compose:

```bash
docker compose up --build -d
```
*Lần đầu chạy sẽ mất khoảng 2-5 phút để tải Docker images và build container.*

---

### Bước 5: Kiểm tra Trạng thái Dịch vụ & Đăng nhập

1. **Kiểm tra trạng thái các container:**
   ```bash
   docker compose ps
   ```
   *Tất cả 10 container (`nginx`, `auth_service`, `question_service`, `exam_service`, `realtime_service`, `grading_service`, `celery_worker`, `proctoring_service`, `postgres`, `mongodb`, `redis`) phải ở trạng thái `Up / healthy`.*

2. **Tài khoản Quản trị viên (Admin) mặc định:**
   Hệ thống đã tự động chạy script seed tài khoản admin đầu tiên khi khởi động:
   * **URL truy cập:** `http://localhost` (hoặc `https://localhost`)
   * **Username:** `admin`
   * **Password:** `Admin@123456`
   * **Email:** `admin@example.com`

3. **Cổng kiểm tra Swagger API Documentation:**
   * Auth Service Docs: `http://localhost/docs` (hoặc `http://localhost:8000/docs`)
   * Question Service Docs: `http://localhost:8001/docs`
   * Exam Service Docs: `http://localhost:8002/docs`
   * Grading Service Docs: `http://localhost:8004/docs`
   * Proctoring Service Docs: `http://localhost:8005/docs`

---

## 3. Cài đặt & Khởi chạy Thủ công (Không dùng Docker)

*Phương pháp này chỉ áp dụng khi máy tính của bạn không thể cài đặt Docker.*

### 3.1. Cài đặt 3 Cơ sở Dữ liệu
1. **PostgreSQL 15+**:
   - Cài đặt PostgreSQL, tạo database `exam_system`.
   - Cấp quyền cho user `postgres` với password `postgres`.
2. **MongoDB 6+**:
   - Cài đặt MongoDB Community Server, chạy cổng `27017`.
3. **Redis 7+**:
   - Cài đặt Redis server, chạy cổng `6379`.

---

### 3.2. Cấu hình & Chạy từng Backend Service
Mỗi service nằm trong thư mục con của `backend/`. Bạn cần mở **6 cửa sổ Terminal** riêng biệt:

#### 1. `auth_service` (Cổng 8000):
```bash
cd backend/auth_service
python -m venv venv && source venv/bin/activate  # Trên Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python create_admin.py
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. `question_service` (Cổng 8001):
```bash
cd backend/question_service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

#### 3. `exam_service` (Cổng 8002):
```bash
cd backend/exam_service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

#### 4. `realtime_service` (Cổng 8003):
```bash
cd backend/realtime_service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```

#### 5. `grading_service` & Celery Worker (Cổng 8004):
```bash
cd backend/grading_service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head

# Terminal 5A: Chạy API
uvicorn main:app --host 0.0.0.0 --port 8004 --reload

# Terminal 5B: Chạy Celery Background Worker
celery -A tasks.celery_app worker --loglevel=info
```

#### 6. `proctoring_service` (Cổng 8005):
```bash
cd backend/proctoring_service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --host 0.0.0.0 --port 8005 --reload
```

---

### 3.3. Cài đặt Nginx API Gateway
1. Cài đặt Nginx trên máy.
2. Sao chép file cấu hình `nginx/nginx.conf` vào thư mục cấu hình của Nginx (`/etc/nginx/nginx.conf` hoặc `C:\nginx\conf\nginx.conf`).
3. Khởi động Nginx: `nginx -s reload`.

---

### 3.4. Khởi chạy Frontend React
Mở terminal tại thư mục `frontend`:
```bash
cd frontend
npm install
npm run dev
```
Truy cập: `http://localhost:5173`.

---

## 4. Chạy Frontend riêng biệt để Phát triển Giao diện

Nếu bạn là Frontend Developer và đã có backend đang chạy trong Docker (hoặc trên Server chung):
```bash
cd frontend

# Cài đặt toàn bộ thư viện
npm install

# Khởi chạy Vite Dev Server (Hỗ trợ Hot Module Replacement tức thì)
npm run dev
```

* **Kiểm tra lỗi TypeScript:** `npm run build`
* **Chạy bộ kiểm thử tự động:** `npm test`

---

## 5. Cấu hình Model AI Giám sát (MediaPipe & YOLOv8n)

### 5.1. MediaPipe Face Landmarker (Nhận diện khuôn mặt & Hướng nhìn)
* Model và WASM runtime được cấu hình tải tự động từ CDN chính thức của Google MediaPipe lúc thí sinh vào phòng thi. Không cần tải thủ công.

### 5.2. YOLOv8n ONNX (Phát hiện Điện thoại / Sách lạ - Tuỳ chọn)
Để kích hoạt tính năng nhận diện thiết bị gian lận ngoại vi:
1. Mở terminal và xuất model ONNX:
   ```bash
   pip install ultralytics
   python -c "from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='onnx')"
   ```
2. Sao chép file `yolov8n.onnx` vừa tạo vào thư mục:
   `frontend/public/models/yolov8n.onnx`
*(Nếu chưa đặt file, hệ thống sẽ tự động tắt tính năng nhận diện vật thể một cách an toàn mà không gây lỗi trang thi).*

---

## 6. Lệnh Quản trị & Vận hành Thường dùng (Cheat Sheet)

| Mục đích | Lệnh thực thi |
| :--- | :--- |
| **Xem log realtime của 1 service** | `docker compose logs -f auth_service` |
| **Xem log toàn bộ hệ thống** | `docker compose logs -f` |
| **Khởi động lại 1 service** | `docker compose restart realtime_service` |
| **Dừng hệ thống (giữ nguyên dữ liệu DB)** | `docker compose down` |
| **Xoá toàn bộ hệ thống & dữ liệu DB** | `docker compose down -v` |
| **Build lại sau khi sửa code backend/docker** | `docker compose up --build -d` |
| **Chạy test frontend (Vitest)** | `cd frontend && npm test` |
| **Chạy test backend (Pytest)** | `pytest backend/tests` |

---

## 7. Khắc phục Sự cố Cài đặt Thường gặp (Troubleshooting)

### ❌ Sự cố 1: Lỗi cổng 80 hoặc 443 bị chiếm (`port is already allocated`)
* **Nguyên nhân:** Máy tính đang chạy IIS (Windows), Apache, Skype hoặc phần mềm web server khác.
* **Cách xử lý:**
  1. Kiểm tra tiến trình đang chiếm cổng: `netstat -ano | findstr :80` (Windows) hoặc `sudo lsof -i :80` (Linux/Mac).
  2. Tắt dịch vụ xung đột hoặc đổi cổng ngoài của Nginx trong `docker-compose.yml` (VD: `"8080:80"`, `"8443:443"`).

### ❌ Sự cố 2: Trình duyệt cảnh báo "Kết nối của bạn không phải là riêng tư" (HTTPS SSL)
* **Nguyên nhân:** Chứng chỉ SSL do script `generate_ssl.py` tự ký (self-signed) cho môi trường dev.
* **Cách xử lý:**
  - Nhấp vào nút **Nâng cao (Advanced)** trên Chrome/Edge/Firefox → Chọn **Tiếp tục truy cập localhost (Không an toàn)**.

### ❌ Sự cố 3: MongoDB không kết nối được / Sai mật khẩu
* **Nguyên nhân:** Tên biến môi trường trong file `.env` chưa đúng chuẩn.
* **Cách xử lý:**
  - Đảm bảo trong `.env` sử dụng biến `MONGO_URI=mongodb://mongo:mongo@mongodb:27017` (thay vì `MONGODB_URL`).

### ❌ Sự cố 4: Gặp lỗi 404 khi gọi API từ Frontend
* **Nguyên nhân:** Cấu hình `VITE_API_URL` bị đặt thành `/api/v1`.
* **Cách xử lý:**
  - Mở `frontend/.env` và đảm bảo: `VITE_API_URL=/api`.

---

*Tài liệu được cập nhật đầy đủ và đồng bộ theo phiên bản mới nhất của ExamTestWebsite.*
