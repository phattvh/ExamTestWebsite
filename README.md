# Exam Test Website

Hệ thống thi trực tuyến kiến trúc **microservices**, hỗ trợ nhiều loại câu hỏi, chấm điểm tự động và giám sát chống gian lận (proctoring) thời gian thực.

## Mục lục

- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Yêu cầu môi trường](#yêu-cầu-môi-trường)
- [Bắt đầu nhanh (Docker)](#bắt-đầu-nhanh-docker)
- [Chạy frontend riêng để phát triển](#chạy-frontend-riêng-để-phát-triển)
- [Chạy không dùng Docker](#chạy-không-dùng-docker)
- [Kiểm thử (Testing)](#kiểm-thử-testing)
- [Database Migrations](#database-migrations)
- [Tài liệu chi tiết](#tài-liệu-chi-tiết)
- [Bảo mật](#bảo-mật)

## Kiến trúc hệ thống

| Service | Vai trò | Cổng (local) |
|---|---|---|
| `auth_service` | Xác thực, JWT, quản lý người dùng | 8000 |
| `question_service` | Ngân hàng câu hỏi (MongoDB) | 8001 |
| `exam_service` | Quản lý kỳ thi, lịch thi, lượt làm bài | 8002 |
| `realtime_service` | WebSocket / Socket.IO đồng bộ trạng thái thi, livestream màn hình & camera | 8003 |
| `grading_service` | Chấm điểm tự động (+ Celery worker) | 8004 |
| `proctoring_service` | Nhận & xử lý sự kiện giám sát, tính điểm rủi ro, bằng chứng vi phạm | 8005 |
| `nginx` | API Gateway, định tuyến `/api/...` tới các service trên | 80 / 443 |

**Hạ tầng dữ liệu:** PostgreSQL (dữ liệu quan hệ), MongoDB (ngân hàng câu hỏi), Redis (cache, pub/sub, broker cho Celery).

**Frontend & Desktop Client:**
- **Web App:** React 18 + TypeScript + Vite + Material UI, giao tiếp với backend qua API Gateway (nginx).
- **Desktop Secure Kiosk Client (`ExamSystemClient.exe`):** Ứng dụng thi độc lập (Electron Native) tích hợp khóa màn hình Kiosk toàn phần, chặn phím tắt hệ thống (`Alt+Tab`, `PrintScreen`, `Ctrl+Shift+Esc`), tự động **CƯỠNG CHẾ TẮT (taskkill)** các ứng dụng gian lận ngầm (UltraViewer, Discord, OBS, AnyDesk, ChatGPT...) và phát sóng trực tiếp màn hình desktop làm bài của thí sinh về phòng Giám thị.

> Sơ đồ kiến trúc chi tiết: [`docs/SoDoKienTrucTongThe.md`](docs/SoDoKienTrucTongThe.md)

## Đóng gói Ứng Dụng Thi Desktop (.exe)
Hệ thống hỗ trợ tạo bộ cài / file thực thi portable độc lập cho thí sinh không cần cài Node.js:

```bash
cd frontend
npm run pack
```
Kết quả đóng gói nằm tại thư mục `frontend/dist-client/` chứa file thực thi **`ExamSystemClient.exe`**. Chỉ cần nén thư mục này và gửi sang máy thí sinh là có thể thi ngay qua mạng LAN/Internet.

## Yêu cầu môi trường

- **Docker** + **Docker Compose** (khuyến nghị — xem [tại sao](docs/SETUP.md#vì-sao-nên-dùng-docker))
- **Node.js 18+** nếu muốn chạy frontend độc lập ngoài Docker
- **Python 3.11+** chỉ cần nếu chạy backend không qua Docker

## Bắt đầu nhanh (Docker)

```bash
git clone https://github.com/CoderIshibuki/ExamTestWebsite.git
cd ExamTestWebsite

# Tạo file .env từ mẫu, điền giá trị thật (không commit file .env lên Git)
cp .env.example .env
cp frontend/.env.example frontend/.env

# Tạo SSL cert dev (tự sinh, không commit — xem phần Bảo mật)
python scripts/generate_ssl.py

# Dựng toàn bộ hệ thống
docker compose up --build
```

Sau khi chạy xong, truy cập:
- Ứng dụng: `http://localhost` (qua nginx gateway)
- Swagger docs của Auth service: `http://localhost/docs`

Hướng dẫn chi tiết từng bước, biến môi trường, và cách xử lý khi thiếu Docker: xem **[docs/SETUP.md](docs/SETUP.md)**.

## Chạy frontend riêng để phát triển

Nếu chỉ cần sửa giao diện và có backend chạy sẵn ở nơi khác (VD: Docker ở máy chính, hoặc server dùng chung):

```bash
cd frontend
npm install
npm run dev
```

Xem thêm [`frontend/README.md`](frontend/README.md).

## Chạy không dùng Docker

Có thể chạy nhưng cần tự cài PostgreSQL, MongoDB, Redis và chạy tay từng service Python — xem hướng dẫn đầy đủ tại **[docs/SETUP.md](docs/SETUP.md#chạy-không-dùng-docker)**.

## Kiểm thử (Testing)

### Backend
```bash
pytest backend/tests/
```

### Frontend
```bash
cd frontend
npm run lint
npm run build
```

### End-to-end (yêu cầu backend đang chạy qua Docker)
```bash
python scripts/e2e_test.py
```

## Database Migrations

Migration được quản lý bằng Alembic, riêng cho từng service dùng PostgreSQL (`auth_service`, `exam_service`, `grading_service`, `proctoring_service`). Docker Compose tự khởi tạo DB khi chạy lần đầu; để chạy tay:

```bash
cd backend/<tên_service>
alembic upgrade head
```

## Tài liệu chi tiết

| Tài liệu | Nội dung |
|---|---|
| [docs/HUONG_DAN_SU_DUNG.md](docs/HUONG_DAN_SU_DUNG.md) | **Hướng dẫn sử dụng chi tiết** (Dành cho Học sinh, Giáo viên, Admin & Giám thị AI) |
| [docs/SETUP.md](docs/SETUP.md) | Hướng dẫn dựng môi trường dev đầy đủ (Docker & không Docker) |
| [docs/ENV_VARS.md](docs/ENV_VARS.md) | Danh sách toàn bộ biến môi trường cần thiết cho từng service |
| [docs/SoDoKienTrucTongThe.md](docs/SoDoKienTrucTongThe.md) | Sơ đồ kiến trúc tổng thể (Mermaid) |
| [docs/SoDoLuongRealTime.md](docs/SoDoLuongRealTime.md) | Sơ đồ luồng real-time lúc thi (Mermaid sequence diagram) |
| [docs/CongNgheSuDung.md](docs/CongNgheSuDung.md) | Danh sách công nghệ/thư viện sử dụng theo từng tầng |
| [docs/ChucNang.docx](docs/ChucNang.docx) | Đặc tả chức năng (Word) |
| [CHANGELOG.md](CHANGELOG.md) | Lịch sử thay đổi |
| [SECURITY.md](SECURITY.md) | Quy tắc xử lý secret & báo cáo lỗ hổng |

## Bảo mật

⚠️ Không commit file `.env`, SSL cert/key hoặc bất kỳ secret nào lên Git — xem [SECURITY.md](SECURITY.md) để biết chi tiết và sự cố đã xảy ra trước đây trong repo này.
