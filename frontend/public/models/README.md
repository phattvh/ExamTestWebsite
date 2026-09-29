# Thư mục model AI cho Proctoring

Đặt file model YOLOv8n dạng ONNX vào đây với tên chính xác `yolov8n.onnx` để bật
tính năng phát hiện vật thể cấm (điện thoại, sách,...) trong lúc thi.

**Vì sao không đóng gói sẵn model trong repo?**
- File model nặng vài MB - vài chục MB, không nên commit vào Git.
- Không nên tự động tải model từ 1 link GitHub/CDN của cá nhân lạ trong lúc chạy — dễ
  vỡ (repo có thể bị xoá bất cứ lúc nào) và không kiểm soát được nguồn gốc/tính toàn vẹn
  của model cho một hệ thống thi cử thật.

## Cách lấy model (chỉ cần làm 1 lần)

```bash
pip install ultralytics
python3 -c "from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='onnx', imgsz=640, opset=12)"
# Lệnh trên tự tải yolov8n.pt chính chủ từ Ultralytics rồi xuất ra yolov8n.onnx
cp yolov8n.onnx frontend/public/models/yolov8n.onnx
```

Model YOLOv8n gốc được huấn luyện trên bộ dữ liệu COCO (80 lớp vật thể), đã có sẵn
2 lớp cần dùng: `cell phone` (index 67) và `book` (index 73) — không cần huấn luyện
lại, dùng được ngay.

Nếu không đặt file này, tính năng phát hiện vật thể sẽ tự động **tắt** (không báo lỗi
vỡ ứng dụng) — các tính năng giám sát khác (Face Mesh, camera ảo, chuyển tab,...) vẫn
hoạt động bình thường.
