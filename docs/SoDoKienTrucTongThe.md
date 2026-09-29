# Sơ đồ kiến trúc tổng thể

> Sơ đồ mô tả đúng theo hệ thống thực tế đang triển khai trong `docker-compose.yml`. Không có message broker (RabbitMQ) hay Analytics Service riêng — các service giao tiếp trực tiếp qua HTTP nội bộ, Redis chỉ dùng cho cache/pub-sub/Celery broker.

```mermaid
flowchart TB
    subgraph Client["Frontend (React + TypeScript + Vite)"]
        UI[Giao diện người dùng]
        WS_Client[Socket.IO Client]
        ProctorAgent[Proctor Agent<br/>WebRTC Camera<br/>Event Collector]
    end

    subgraph Gateway["API Gateway (nginx)"]
        LB[nginx reverse proxy<br/>định tuyến /api/v1/...]
    end

    subgraph Services["Backend Services (FastAPI, Python)"]
        Auth[Auth Service :8000<br/>- Xác thực JWT<br/>- Quản lý người dùng]
        Question[Question Service :8001<br/>- Ngân hàng câu hỏi]
        Exam[Exam Service :8002<br/>- Quản lý kỳ thi, lượt làm bài]
        RealTime[Realtime Service :8003<br/>- Socket.IO<br/>- Đồng bộ trạng thái thi]
        Grading[Grading Service :8004<br/>- Chấm điểm tự động<br/>+ Celery worker]
        Proctor[Proctoring Service :8005<br/>- Nhận sự kiện giám sát<br/>- Tính điểm rủi ro]
    end

    subgraph Data["Cơ sở dữ liệu"]
        PG[(PostgreSQL<br/>Users, Exams, Attempts, Violations)]
        MG[(MongoDB<br/>Questions)]
        RD[(Redis<br/>Cache, Pub/Sub, Celery broker)]
    end

    UI --> LB
    WS_Client -->|WebSocket / Socket.IO| RealTime
    ProctorAgent -->|Sự kiện & ảnh chụp màn hình| LB

    LB --> Auth
    LB --> Question
    LB --> Exam
    LB --> Grading
    LB --> Proctor
    LB -->|/ws/| RealTime

    Auth --> PG
    Exam --> PG
    Grading --> PG
    Proctor --> PG
    Question --> MG

    Grading -.Celery task queue.-> RD
    Proctor -.risk cache.-> RD
    RealTime -.session state.-> RD

    Exam -->|HTTP nội bộ, xác thực bằng X-Internal-Token| Question
    Grading -->|HTTP nội bộ| Exam
    Grading -->|HTTP nội bộ| Question
    Proctor -->|HTTP nội bộ| RealTime

    Auth -.JWT_SECRET dùng chung, mỗi service tự giải mã JWT, không gọi ngược Auth.- Exam
    Auth -.-. Grading
    Auth -.-. Proctor
    Auth -.-. RealTime
```

## Ghi chú

- **Không có message broker riêng (RabbitMQ)**: các service gọi trực tiếp HTTP với nhau qua các biến `EXAM_SERVICE_URL`, `QUESTION_SERVICE_URL`, `REALTIME_SERVICE_URL` (xem [ENV_VARS.md](ENV_VARS.md)). Redis chỉ đóng vai trò cache/pub-sub/Celery broker, không phải message bus giữa các service nghiệp vụ.
- **Xác thực phi tập trung**: mỗi service backend tự giải mã JWT bằng `JWT_SECRET` dùng chung, không gọi ngược lại `auth_service` để xác thực mỗi request — giúp giảm độ trễ và tránh single point of failure.
- **Celery worker** chạy tách biệt (container `celery_worker`), dùng chung code với `grading_service`, xử lý chấm điểm nặng bất đồng bộ.
- Chưa có **Analytics Service** trong hệ thống hiện tại — báo cáo/thống kê hiện được cung cấp qua endpoint `stats/overview` và `stats/reports` của `exam_service`.
