# Cấu hình tối ưu tốc độ thi trên nền tảng giáo viên (VJP Pro)

## Nguyên tắc chung
- Kỳ thi chạy **in-memory** (Redis + bộ nhớ client), chỉ ghi DB khi thật cần → không nghẽn PostgreSQL khi cả trường vào thi cùng lúc.
- Camera giám sát **không upload ảnh liên tục**: chỉ gửi khung hình khi có rủi ro (anti-cheat chạy ngay trên máy thí sinh bằng WebRTC/Canvas).

## 1. Trước giờ thi (giáo viên chuẩn bị)
| Việc | Lý do |
|---|---|
| Bấm **"Chuẩn bị kỳ thi"** trong app quản lý thi | Backend warm cache: tải toàn bộ đề + xáo trộn câu hỏi/ngẫu nhiên đáp án vào Redis (`exam:{id}:shuffled:{hash}`) |
| Giới hạn **60 thí sinh/phòng**, chia ca nếu lớp đông | Mỗi phòng là 1 channel Redis Pub/Sub; phòng nhỏ giảm broadcast storm |
| Kiểm tra đường truyền bằng mục **Speed Test** (đo RTT tới server qua WebSocket ping) | Phát hiện sớm phòng máy yếu; bật chế độ dự phòng HTTP-polling |

## 2. Cấu hình server (docker-compose đã áp sẵn)
```yaml
# Redis: maxmemory + LRU để cache đề thi không phình RAM
redis:
  command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru --appendonly no

# Auth/FastAPI: nhiều worker, giữ kết nối pool
auth_service:
  command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# Nginx: bật gzip, websocket upgrade, keepalive upstream (đã cấu hình trong nginx.conf)
```

## 3. Trong giờ thi
- **Câu hỏi push 1 lần qua WebSocket**, client giữ trong RAM → chuyển câu 0ms, không request DB.
- Đáp án autosave batch 5 giây/lần qua kênh `answers:{session}` (Redis Stream), **không ghi PostgreSQL từng câu**.
- Token access sống dai hơn trong lúc thi (`ACCESS_TOKEN_EXPIRE_MINUTES=120`) + auto-refresh qua `/auth/refresh` → hết phiên giữa giờ do token hết hạn.
- Heartbeat 15s phát hiện mất kết nối; thí sinh F5 reconnect lấy nguyên trạng thái từ Redis (không mất tiến trình).

## 4. Nộp bài & chấm
- Nộp bài chỉ gửi `session_id`; Grading Service đọc đáp án từ Redis → chấm tức thì câu trắc nghiệm, điểm trả về < 2s.
- Sự kiện chấm điểm publish qua Redis Pub/Sub, Analytics ghi gộp (batch insert mỗi 10s).

## 5. Camera proctoring (tối ưu băng thông)
- Canvas snapshot **320px JPEG chất lượng 40%** (~10KB/khung), gửi tối đa 1 khung/3s **chỉ khi phát hiện sự kiện** (rời khung hình, nhiều người, tab-switch).
- Full-quality snapshot chỉ chụp khi vi phạm severity ≥ medium → lưu object storage, không chặn luồng thi.
