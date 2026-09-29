# Changelog

Tất cả các thay đổi, nâng cấp và bản vá bảo mật của dự án **ExamTestWebsite** được ghi nhận chi tiết tại đây theo định dạng [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/).

---

## [2.1.0] - 2026-09-01

### 🛡️ Desktop Standalone Client & Chống Gian Lận Cấp Hệ Điều Hành

1. **Đóng gói Ứng Dụng Thi Desktop Độc Lập (.exe Portable):**
   - Thêm kịch bản đóng gói `npm run pack` tự động tạo `dist-client/ExamSystemClient.exe`.
   - Ứng dụng hoạt động độc lập (Zero-dependency), không yêu cầu cài đặt Node.js hay bất kỳ môi trường nào trên máy thí sinh.
   - Hỗ trợ cấu hình `server_config.json` để kết nối linh hoạt tới máy chủ trường học hoặc mạng LAN.

2. **Cưỡng Chế Đóng (Taskkill / Force Shutdown) Tiến Trình Gian Lận:**
   - Module Anti-cheat Kiosk quét tiến trình OS mỗi 5 giây.
   - Khi phát hiện bất kỳ phần mềm cấm nào (UltraViewer, TeamViewer, AnyDesk, Discord, OBS Studio, Zalo, Telegram, ChatGPT Desktop, VMware, VirtualBox...), ứng dụng tự động thực thi lệnh hệ thống `taskkill /F /IM` để tắt ngay lập tức.
   - Tự động bắn cảnh báo đỏ trên màn hình thí sinh và gửi log vi phạm về bảng giám sát thời gian thực.

3. **Chụp và Phát Sóng Đúng Màn Hình Desktop Làm Bài (Native Desktop Screen Streaming):**
   - Tích hợp API `desktopCapturer` của nhân hệ điều hành (`capture-screen-frame`).
   - Phát sóng liên tục ảnh chụp toàn bộ màn hình làm bài của thí sinh về phòng Giám thị với kích thước chuẩn 640x360 siêu nhẹ (~15KB/frame), bảo đảm không gây nghẽn băng thông Wi-Fi.

4. **Tăng Tốc Phần Cứng GPU & Tối Ưu Độ Trễ (Zero-lag):**
   - Bật cờ tăng tốc đồ họa GPU Rasterization, Zero-Copy Buffers, và tắt cơ chế Background Timer Throttling trong Electron.
   - Áp dụng `React.memo` cho thẻ giám sát thí sinh (`StudentCard.tsx`), loại bỏ hoàn toàn hiện tượng re-render liên tục và đơ/quay tròn.

5. **Hoàn Thiện Bộ Phạt & Tinh Chỉnh Quy Chế Thi:**
   - Đảm bảo 100% lệnh kỷ luật từ Giám thị (Trừ điểm, Trừ thời gian, Cảnh cáo, Cấm thi) được chuyển phát và hiển thị ngay lập tức trên máy thí sinh.
   - Loại bỏ các giới hạn số lần thi tối đa và biểu tượng thùng rác không cần thiết trong bảng quản lý thí sinh.

---

## [2.0.0] - 2026-08-28

### 🌟 Tính Năng Mới & Nâng Cấp Đột Phá

1. **Teacher Portal & Đồng bộ Nhận diện Giảng dạy:**
   - Tạo không gian làm việc chuyên biệt dành cho Giáo viên với phong cách nhận diện Emerald Green (`#059669`).
   - Phân quyền dữ liệu đề thi nghiêm ngặt: Giáo viên chỉ có quyền xem, chấm và quản lý các đề thi do mình tạo hoặc được phân công làm cộng tác viên/giám thị. Admin có toàn quyền điều hành hệ thống.

2. **Quy trình Chấm bài Tự luận Gom nhóm theo Đề thi:**
   - Tái thiết kế trang `ManualGrading.tsx` thành mô hình 2 bước tiện lợi: Chọn đề thi có bài tự luận cần chấm → Mở không gian chấm bài tập trung chi tiết cho từng học sinh.

3. **Hỗ trợ Đa phương tiện Media (Hình ảnh, Video, Audio nghe hiểu):**
   - Mở rộng model câu hỏi hỗ trợ `image`, `video` (YouTube embed / video MP4 trực tiếp) và `audio` (file nghe hiểu .mp3).
   - Tích hợp công cụ nhập và xem trước media trong `ManualQuestionDialog.tsx`.
   - Hiển thị trình phát đa phương tiện trực quan, tương thích mọi thiết bị trong `QuestionPanel.tsx` và `ExamRoom.tsx`.

4. **Nhập Tài khoản Học sinh Hàng loạt từ File Excel:**
   - Thêm tiện ích `excelUserTransform.ts` và hộp thoại `ExcelUserImportDialog.tsx` cho phép tải file mẫu chuẩn `.xlsx` và nhập hàng trăm tài khoản học sinh chỉ trong vài giây với xác thực định dạng và cờ yêu cầu đổi mật khẩu lần đầu.

5. **Tối ưu hóa Ngân hàng Câu hỏi & Bỏ mức độ khó theo yêu cầu:**
   - Lược bỏ cột `difficulty` khỏi mẫu nhập Excel và quy trình thêm câu hỏi.
   - Bổ sung thanh tìm kiếm tức thì theo từ khóa, môn học, thẻ tags.
   - Thêm bộ lọc dropdown theo danh mục và thể loại câu hỏi.
   - Hỗ trợ chọn nhiều câu hỏi với checkbox để **Gán vào danh mục hàng loạt** hoặc **Xóa hàng loạt**.

6. **Thư viện Quản lý Bằng chứng & Hình ảnh Vi phạm Sau thi (Evidence Gallery):**
   - Thêm trang `AdminViolations.tsx` tổ chức hình ảnh vi phạm dạng thư mục theo cú pháp: `<Tên bài thi> — <Ngày thi> [<Giờ bắt đầu> - <Giờ kết thúc>]`.
   - Xem chi tiết từng thí sinh vi phạm, loại vi phạm, mức độ rủi ro và mốc thời gian chính xác.
   - Cho phép tải ảnh bằng chứng chất lượng cao về máy tính và xóa bản ghi/thư mục khi hoàn tất xử lý.

7. **Công tắc Bật/Tắt Giám thị AI & Chống gian lận cho từng Đề thi:**
   - Thêm tùy chọn `enable_proctoring` trong cấu hình đề thi. Khi tắt, thí sinh có thể làm bài tự do mà không yêu cầu camera hay ghi nhận cảnh báo vi phạm.

8. **Cải tiến Giám sát Phòng thi & Thực thi Kỷ luật Vĩnh viễn:**
   - Thêm nút làm mới tức thì (Instant Refresh) trên thanh công cụ giám thị.
   - Cập nhật cơ chế cấm thi nghiêm ngặt: Thí sinh bị cấm thi sẽ bị xóa session và chặn truy cập phòng thi triệt để.

---

## [1.4.0] - 2026-08-27

### 🚀 Nâng cấp Giao diện & Trải nghiệm Người dùng (UI/UX)
- **Thiết kế chuẩn Modern SaaS (Lấy cảm hứng từ 21st.dev):**
  - Tích hợp bộ font quốc tế **Inter** và **Plus Jakarta Sans** sắc nét.
  - Sidebar Dark Slate (`#0F172A`), workspace nền xám sáng nhẹ (`#F8FAFC`), card viền mảnh 1px bo góc tròn `14px`.
- **Zen Focus Mode cho Phòng thi (`ExamRoom.tsx`):**
  - Đồng hồ đếm ngược dạng pill badge đổi màu linh hoạt theo thời gian còn lại (xanh lục → vàng nhấp nháy → đỏ cảnh báo gấp).
  - Thẻ câu hỏi và lựa chọn đáp án tương tác mượt mà: viền xanh dương `#2563EB`, nền xanh nhạt `#EFF6FF` khi chọn.
  - Bento Matrix điều hướng câu hỏi bên phải với 3 trạng thái màu rõ rệt (*Đang xem*, *Đã làm*, *Chưa làm*).
- **Bento Stats cho Kết quả thi (`ResultSummary.tsx`, `StudentResults.tsx`):**
  - Loại bỏ các banner xanh to choán tầm nhìn.
  - Bố cục thẻ Bento với các chỉ số KPI: Tỉ lệ đạt, Số câu đúng (xanh lá), Số câu sai (đỏ), Điểm số tổng.
- **Trung tâm Giám thị AI Proctoring (`StudentCard.tsx`, `ViolationFeed.tsx`):**
  - Hiển thị đầy đủ **Họ và tên thật**, **@username** và **Địa chỉ IP máy thí sinh**.
  - Viền màu phân loại rủi ro (🟢 An toàn / 🟡 Cảnh báo / 🔴 Vi phạm nghiêm trọng).

### ⚡ Tối ưu Hiệu năng & Code Splitting
- Chuyển đổi toàn bộ routing trong `frontend/src/App.tsx` sang **`React.lazy()` + `<Suspense>`** với spinner loading mượt mà.
- Cấu hình Rollup `manualChunks` trong `vite.config.ts` chia tách vendor libraries: `vendor-mui`, `vendor-charts`, `vendor-ai`.
- **Kết quả đo đạc thực tế:**
  - Initial JS bundle giảm từ **2.68 MB** xuống còn **228 kB** (giảm hơn **91%** dung lượng tải trang đầu).
  - Tốc độ `npm run build` giảm từ **21.76s** xuống còn **11.33s** (nhanh hơn gấp đôi).
  - Tất cả các trang được tải on-demand theo từng chunk 2-15 kB.

### 🧪 Kiểm thử Tự động & Tài liệu
- Bổ sung bộ kiểm thử tự động với Vitest (`npm test`): **4 test files, 8 tests passed 100%**.
- Viết test suite `excelQuestionTransform.test.ts` kiểm thử toàn diện logic biến đổi và validate dữ liệu Import Excel.
- Hoàn thiện tài liệu **Hướng dẫn Sử dụng Chi tiết** tại `docs/HUONG_DAN_SU_DUNG.md`.
- Hoàn thiện tài liệu **Hướng dẫn Cài đặt & Triển khai Toàn diện** tại `docs/SETUP.md`.

---

## [1.3.0] - 2026-08-21

### 🛡️ Bảo mật, RBAC & Chống Race Condition
- **Chống Race Condition tạo lượt thi (`start_exam`):** Áp dụng khoá `pg_advisory_xact_lock` với thuật toán `hashtext(exam_id, user_id)` trong Postgres, chặn hoàn toàn tình trạng mở nhiều tab hoặc double click để vượt quá số lượt thi cho phép.
- **Bảo vệ tài khoản Quản trị viên:** Chặn admin tự xoá, tự hạ quyền hoặc tự khoá chính mình trong `AdminUsers.tsx`.
- **Xử lý lỗi UX đồng loạt:** Bắt và hiển thị thông báo lỗi chi tiết từ backend thay vì thông báo chung chung ở 11 component (`AdminUsers`, `AdminExams`, `AdminQuestions`, `AdminCategories`, `ManualQuestionDialog`, `ManualGrading`, `ExamRoom`).
- **Cảnh báo mất kết nối lưu bài thi (`ExamRoom.tsx`):** Thêm Snackbar thông báo ngay lập tức nếu việc tự động lưu đáp án về server gặp sự cố mạng.

---

## [1.2.0] - 2026-08-15

### 📹 Giám thị Live WebRTC & Chấm thi Tự luận
- **Livestream Video WebRTC cho Giám thị:** Thêm WebRTC signaling peer-to-peer qua `realtime_service`, cho phép giám thị xem trực tiếp camera thí sinh theo thời gian thực.
- **Chấm điểm Tự luận Thủ công (Manual Grading):** Hỗ trợ giáo viên xem bài làm văn bản hoặc ảnh chụp tay của học sinh, nhập điểm và lời nhận xét để tự động cộng vào điểm tổng kết.
- **Quản lý Danh mục Môn học (`AdminCategories.tsx`):** Thêm tính năng phân loại môn học cho ngân hàng câu hỏi.
- **Kiểm soát Khung giờ Lịch thi (Exam Schedule):** Bắt buộc kiểm tra khung giờ thi hợp lệ tại backend `start_exam`.
- **Quên mật khẩu & Đổi mật khẩu:** Thêm quy trình cấp lại mật khẩu an toàn qua email với token hash có thời hạn 30 phút và rate-limiting.
- **Import / Export Excel Ngân hàng Câu hỏi:** Hỗ trợ xuất và nhập câu hỏi trắc nghiệm, đúng/sai chuẩn định dạng bảng tính Excel.

### 🔒 Vá Lỗ hổng Bảo mật
- Yêu cầu xác thực `question:read` cho toàn bộ API xem ngân hàng câu hỏi (trước đây không yêu cầu đăng nhập).
- Kiểm tra quyền `role` (Admin/Teacher) khi tham gia phòng giám thị `join_proctor_room`.
- Nhúng `role` claim vào JWT token tại `auth_service`.
- Tự động chạy `alembic upgrade head` cho các service khi khởi động qua Docker Compose.

---

## [1.1.0] - 2026-08-10

### 🤖 AI Proctoring Edge Computing
- **MediaPipe Face Landmarker:** Nhận diện khuôn mặt, phát hiện quay đầu góc lệch >25°, phát hiện rời khỏi khung hình hoặc xuất hiện nhiều người trong camera.
- **YOLOv8n ONNX Object Detection:** Tích hợp mô hình nhận diện thiết bị lạ (điện thoại di động, sách vở) chạy qua ONNX Runtime WASM trong trình duyệt.
- **Nhận diện Camera Ảo:** Kiểm tra danh sách thiết bị ngoại vi để cảnh báo các phần mềm camera ảo (OBS, ManyCam).
- **Quản lý Đề thi Nâng cao (`ManageExamDialog.tsx`):** Thêm giao diện chọn câu hỏi thủ công, chọn ngẫu nhiên theo tiêu chí và phân công giáo viên gác thi.

---

## [1.0.0] - 2026-08-08

### 🌟 Khởi tạo Hệ thống Khảo thí Microservices
- Xây dựng 6 microservices độc lập:
  - `auth_service`: Xác thực người dùng, JWT, RBAC.
  - `question_service`: Ngân hàng câu hỏi lưu trữ trên MongoDB.
  - `exam_service`: Quản lý kỳ thi, lượt thi, roster trên PostgreSQL.
  - `realtime_service`: Đồng bộ trạng thái thi qua WebSocket/Socket.IO.
  - `grading_service`: Chấm điểm tự động và Celery background worker.
  - `proctoring_service`: Ghi nhận sự kiện vi phạm và tính điểm rủi ro qua Redis.
- Cấu hình Nginx API Gateway định tuyến reverse proxy qua cổng 80/443.
- Xây dựng giao diện học sinh và bảng điều khiển quản trị bằng React + TypeScript + Material UI.
