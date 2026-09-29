# Biến môi trường

Tổng hợp toàn bộ biến môi trường dùng trong dự án, tránh phải dò từng file `docker-compose.yml`/service.

## `.env` (thư mục gốc — dùng cho toàn bộ backend qua Docker Compose)

| Biến | Bắt buộc | Mô tả | Ví dụ |
|---|---|---|---|
| `POSTGRES_USER` | ✅ | User đăng nhập PostgreSQL | `postgres` |
| `POSTGRES_PASSWORD` | ✅ | Mật khẩu PostgreSQL | *(tự đặt, đủ mạnh)* |
| `POSTGRES_DB` | ✅ | Tên database PostgreSQL | `exam_db` |
| `POSTGRES_HOST` | Docker tự set | Host PostgreSQL (tên container) | `postgres` |
| `POSTGRES_PORT` | Docker tự set | Cổng nội bộ PostgreSQL | `5432` |
| `MONGO_INITDB_ROOT_USERNAME` | ✅ | User root MongoDB | `mongo` |
| `MONGO_INITDB_ROOT_PASSWORD` | ✅ | Mật khẩu root MongoDB | *(tự đặt, đủ mạnh)* |
| `MONGO_URI` | ✅ | Connection string MongoDB đầy đủ | `mongodb://<user>:<pass>@mongodb:27017/exam_db?authSource=admin` |
| `REDIS_URL` | ✅ | Connection string Redis (dùng chung cho cache, Celery broker, pub/sub) | `redis://redis:6379` |
| `JWT_SECRET` | ✅ | Khoá ký JWT — **dùng chung giữa mọi service**, đổi khác nhau sẽ khiến xác thực chéo service bị lỗi | *(chuỗi ngẫu nhiên dài, giữ bí mật)* |
| `JWT_ALGORITHM` | Có default | Thuật toán ký JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Có default | Thời hạn access token | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Có default | Thời hạn refresh token | `7` |
| `CORS_ORIGINS` | ✅ (production) | Danh sách origin được phép gọi API, dạng JSON array | `["https://your-domain.com"]` |
| `EXAM_SERVICE_URL` | Docker tự set | URL nội bộ exam_service (để service khác gọi HTTP) | `http://exam_service:8000` |
| `QUESTION_SERVICE_URL` | Docker tự set | URL nội bộ question_service | `http://question_service:8000` |
| `REALTIME_SERVICE_URL` | Docker tự set | URL nội bộ realtime_service | `http://realtime_service:8000` |

> Các biến đánh dấu "Docker tự set" đã có giá trị mặc định phù hợp trong `docker-compose.yml` khi chạy qua Docker; chỉ cần chỉnh tay nếu chạy **không dùng Docker** (đổi tên container thành `localhost`) — xem [SETUP.md](SETUP.md#chạy-không-dùng-docker).

## `frontend/.env` (frontend Vite)

| Biến | Bắt buộc | Mô tả | Giá trị đúng |
|---|---|---|---|
| `VITE_API_URL` | ✅ | Base URL gọi API, được các module trong `src/api/*.ts` tự nối thêm `/v1/...` hoặc `/auth/...` phía sau | `/api` (dev qua Vite proxy hoặc cùng origin với nginx) |

⚠️ **Lỗi thường gặp:** đặt `VITE_API_URL=/api/v1` sẽ khiến request thành `/api/v1/v1/exams/...` (lặp `v1`) vì `apiClient.ts` đã tự thêm `/v1/exams/...` — dẫn đến toàn bộ API thi/chấm điểm/giám sát bị 404. Luôn dùng `/api` (không có `/v1`).

Nếu chạy frontend độc lập, trỏ tới backend ở nơi khác (VD server LAN), đặt full URL: `VITE_API_URL=http://192.168.1.10/api`.

## Quy tắc chung

- **Không bao giờ commit file `.env` thật lên Git** — chỉ commit `.env.example` (giá trị mẫu, không phải secret thật).
- Mọi service Python trong `docker-compose.yml` dùng chung 1 file `.env` gốc (`env_file: .env`) — không cần tạo `.env` riêng cho từng service.
- `JWT_SECRET` phải giống nhau ở mọi service vì `exam_service`, `grading_service`, `proctoring_service`, `realtime_service` đều tự giải mã JWT do `auth_service` phát hành (không gọi ngược lại `auth_service` để xác thực mỗi request — xem [SoDoKienTrucTongThe.md](SoDoKienTrucTongThe.md)).
