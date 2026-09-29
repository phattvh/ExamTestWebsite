# Sơ đồ luồng real-time lúc thí sinh làm bài

```mermaid
sequenceDiagram
    participant T as Thí sinh (React + Proctor Agent)
    participant WS as Realtime Service
    participant PG as PostgreSQL
    participant R as Redis
    participant E as Exam Service
    participant G as Grading Service
    participant P as Proctoring Service
    participant Admin as Dashboard Giám thị

    T->>WS: Kết nối Socket.IO (vào phòng thi)
    WS->>R: Lưu trạng thái phiên (session)
    WS-->>T: Xác nhận kết nối thành công

    T->>E: Bắt đầu làm bài (POST /exams/{id}/start)
    E->>PG: Tạo bản ghi lượt thi (attempt)
    E-->>T: Trả về attempt_id, thời gian hết hạn

    loop Trả lời từng câu hỏi
        T->>E: Lưu đáp án (POST /attempts/{id}/answers)
        E->>PG: Cập nhật đáp án đã chọn
    end

    par Giám sát chống gian lận (song song)
        loop Trong suốt quá trình thi
            T->>P: Gửi sự kiện giám sát (rời tab, mất focus,...)
            P->>P: Đánh giá mức độ rủi ro
            P->>PG: Lưu vi phạm (nếu có)
            P->>R: Cập nhật điểm rủi ro (risk:{exam_id}:{user_id}, TTL 10 phút)
            P->>WS: Gửi cảnh báo vi phạm nghiêm trọng
            WS-->>Admin: Đẩy cảnh báo real-time tới giám thị
        end
    end

    T->>E: Nộp bài (POST /attempts/{id}/submit)
    E->>G: Yêu cầu chấm điểm (HTTP nội bộ)
    G->>PG: Đọc đáp án đã lưu + đáp án đúng
    G->>PG: Lưu kết quả chấm điểm
    G-->>T: Trả về điểm số, chi tiết đúng/sai
```

## Ghi chú

- Kết nối real-time (Socket.IO) hiện dùng chủ yếu để **giám thị** (Admin/Teacher dashboard) nhận cảnh báo vi phạm trực tiếp — luồng nộp bài/chấm điểm của **thí sinh** đi qua HTTP thông thường (`exam_service` → `grading_service`), không bắt buộc qua WebSocket.
- Điểm rủi ro (`risk score`) được lưu trong Redis với TTL 10 phút, không phải lưu vĩnh viễn trong PostgreSQL — vi phạm (violation) mới là dữ liệu được lưu bền trong PostgreSQL.
- Xem chi tiết các endpoint liên quan trong Swagger docs của từng service (`http://localhost:800{2,3,4,5}/docs` khi chạy qua Docker).
