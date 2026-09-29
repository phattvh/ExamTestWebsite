# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG KHẢO THÍ & GIÁM THỊ TRỰC TUYẾN AI
> **ExamSystem** — Nền tảng tổ chức thi trực tuyến, chấm điểm tự động và giám sát thời gian thực bằng Trí tuệ Nhân tạo.

---

## 📌 MỤC LỤC

1. [Tổng quan & Phân quyền Người dùng](#1-tổng-quan--phân-quyền-người-dùng)
2. [Tài khoản & Đăng nhập](#2-tài-khoản--đăng-nhập)
3. [Hướng dẫn dành cho Thí sinh (Học sinh / Student)](#3-hướng-dẫn-dành-cho-thí-sinh-học-sinh--student)
   - [3.1. Kiểm tra Thiết bị & Camera AI](#31-kiểm-tra-thiết-bị--camera-ai)
   - [3.2. Vào thi & Nhập mật khẩu đề thi](#32-vào-thi--nhập-mật-khẩu-đề-thi)
   - [3.3. Thao tác trong Phòng thi](#33-thao-tác-trong-phòng-thi)
   - [3.4. Dạng câu hỏi có Đính kèm Media (Ảnh, Video, Audio nghe hiểu)](#34-dạng-câu-hỏi-có-đính-kèm-media)
   - [3.5. Nộp bài & Xem kết quả chi tiết](#35-nộp-bài--xem-kết-quả-chi-tiết)
4. [Hướng dẫn dành cho Giáo viên (Teacher Portal)](#4-hướng-dẫn-dành-cho-giáo-viên-teacher-portal)
   - [4.1. Giao diện & Không gian làm việc riêng biệt](#41-giao-diện--không-gian-làm-việc-riêng-biệt)
   - [4.2. Xây dựng Ngân hàng Câu hỏi & Đính kèm Media](#42-xây-dựng-ngân-hàng-câu-hỏi--đính-kèm-media)
   - [4.3. Quản lý Danh mục, Tìm kiếm & Thao tác Hàng loạt](#43-quản-lý-danh-mục-tìm-kiếm--thao-tác-hàng-loạt)
   - [4.4. Tạo & Cấu hình Đề thi (Bật/Tắt Giám thị AI, Mật khẩu, Lịch thi)](#44-tạo--cấu-hình-đề-thi)
   - [4.5. Chấm bài Tự luận theo từng Đề thi (Manual Grading)](#45-chấm-bài-tự-luận-theo-từng-đề-thi)
   - [4.6. Giám sát Phòng thi Trực tiếp (Live Proctoring & Kỷ luật Thí sinh)](#46-giám-sát-phòng-thi-trực-tiếp)
5. [Hướng dẫn dành cho Quản trị viên (Admin)](#5-hướng-dẫn-dành-cho-quản-trị-viên-admin)
   - [5.1. Dashboard Thống kê Tổng quan](#51-dashboard-thống-kê-tổng-quan)
   - [5.2. Quản lý Người dùng & Nhập Học sinh Hàng loạt từ Excel](#52-quản-lý-người-dùng--nhập-học-sinh-hàng-loạt-từ-excel)
   - [5.3. Thư viện Quản lý Bằng chứng & Hình ảnh Vi phạm Sau thi](#53-thư-viện-quản-lý-bằng-chứng--hình-ảnh-vi-phạm-sau-thi)
   - [5.4. Báo cáo & Phân tích](#54-báo-cáo--phân-tích)
6. [Cơ chế Giám sát AI & Chống Gian Lận](#6-cơ-chế-giám-sát-ai--chống-gian-lận)
7. [Khắc phục Sự cố Thường gặp (FAQ)](#7-khắc-phục-sự-cố-thường-gặp-faq)

---

## 1. Tổng quan & Phân quyền Người dùng

Hệ thống phân cấp 3 vai trò người dùng chính:

| Vai trò | Giao diện & Quyền hạn chính |
| :--- | :--- |
| **Học sinh (Student)** | • Xem danh sách đề thi được mở.<br>• Kiểm tra camera trước khi thi.<br>• Làm bài thi có/không có giám sát AI tùy cấu hình đề.<br>• Hỗ trợ làm bài trắc nghiệm, tự luận, nối cột, nghe audio, xem video clip.<br>• Xem điểm số, tỷ lệ đúng/sai và lời giải chi tiết sau khi nộp. |
| **Giáo viên (Teacher)** | • **Teacher Portal** chuyên dụng với nhận diện Emerald Green.<br>• Chỉ quản lý các đề thi do mình tạo hoặc được phân công coi thi/chấm bài.<br>• Tạo và quản lý ngân hàng câu hỏi (đính kèm ảnh, video YouTube, file nghe .mp3).<br>• Tìm kiếm, lọc theo danh mục, gán danh mục & xóa câu hỏi hàng loạt.<br>• Chấm bài tự luận gom nhóm theo đề thi.<br>• Giám sát webcam trực tiếp, xử lý kỷ luật (cảnh báo, trừ giờ, trừ điểm, cấm thi). |
| **Quản trị viên (Admin)** | • Toàn quyền quản lý mọi đề thi, câu hỏi, báo cáo trong hệ thống.<br>• Quản lý tài khoản: Thêm mới, đổi vai trò, kích hoạt/khóa tài khoản.<br>• **Nhập hàng loạt tài khoản học sinh từ file Excel (.xlsx)**.<br>• **Thư viện Quản lý Hình ảnh & Bằng chứng Gian lận Sau thi** (xem ảnh, tải về máy, xóa theo đợt thi). |

---

## 2. Tài khoản & Đăng nhập

### 2.1. Đăng nhập
1. Truy cập trang chủ hệ thống tại `http://localhost/` (hoặc cổng cấu hình).
2. Nhập **Tên đăng nhập (hoặc Email)** và **Mật khẩu**.
3. Hệ thống sẽ tự động chuyển hướng về trang tương ứng với vai trò của bạn.

### 2.2. Đổi mật khẩu & Yêu cầu đổi mật khẩu lần đầu
- Với tài khoản mới được nhập từ file Excel, hệ thống sẽ kích hoạt cờ yêu cầu đổi mật khẩu khi đăng nhập lần đầu.
- Người dùng có thể chủ động đổi mật khẩu tại trang **Trang cá nhân** > **Đổi mật khẩu**.

---

## 3. Hướng dẫn dành cho Thí sinh (Học sinh / Student)

### 3.1. Kiểm tra Thiết bị & Camera AI
- Trước khi vào phòng thi, thí sinh nên truy cập mục **Kiểm tra Camera** trên thanh menu để đảm bảo trình duyệt đã cấp quyền truy cập camera và mô hình AI nhận diện khuôn mặt hoạt động bình thường.

### 3.2. Vào thi & Nhập mật khẩu đề thi
1. Vào mục **Danh sách Đề thi** để xem các bài thi đang mở.
2. Với các bài thi có biểu tượng 🔒 **Yêu cầu mật khẩu**, một hộp thoại sẽ hiện lên yêu cầu nhập mật khẩu do giám thị/giáo viên cung cấp.
3. Nhập đúng mật khẩu và bấm **Bắt đầu làm bài**.

### 3.3. Thao tác trong Phòng thi
- **Thanh trạng thái đầu trang**: Hiển thị tên bài thi, đồng hồ đếm ngược và nút nộp bài.
- **Bảng điều hướng câu hỏi**: Cho phép nhảy nhanh đến từng câu hỏi, hiển thị rõ câu đã làm (xanh lá), câu đang làm (xanh dương) và câu chưa trả lời.
- **Chống gian lận**: Với đề thi có kích hoạt giám sát AI, thí sinh không được chuyển tab, rời khỏi màn hình hoặc để người khác xuất hiện trước camera.

### 3.4. Dạng câu hỏi có Đính kèm Media
- **Hình ảnh**: Ảnh minh họa hiển thị rõ nét bên dưới nội dung câu hỏi.
- **Video clip**: Hỗ trợ video MP4 hoặc nhúng trực tiếp YouTube player.
- **Audio nghe hiểu**: Hỗ trợ phát file âm thanh (.mp3, .wav) trực tiếp trên giao diện để làm bài trắc nghiệm nghe hiểu tiếng Anh, kiểm tra thính giác,...

### 3.5. Nộp bài & Xem kết quả chi tiết
- Sau khi nộp bài, hệ thống hiển thị điểm số tức thì đối với các câu trắc nghiệm.
- Nếu đề thi có câu tự luận, hệ thống thông báo trạng thái "Đang chờ giáo viên chấm điểm" và hiển thị điểm tạm tính.

---

## 4. Hướng dẫn dành cho Giáo viên (Teacher Portal)

### 4.1. Giao diện & Không gian làm việc riêng biệt
- Khi đăng nhập với tài khoản Giáo viên, hệ thống áp dụng giao diện **Teacher Portal** với tông màu Xanh Ngọc Emerald (`#059669`), ẩn các mục quản trị người dùng để tập trung vào thi cử và chấm bài.
- **Quyền riêng tư & Bảo mật**: Giáo viên chỉ xem và quản lý những đề thi do mình tạo, đề thi mình được thêm làm đồng tác giả (collaborator) hoặc giám thị coi thi (proctor).

### 4.2. Xây dựng Ngân hàng Câu hỏi & Đính kèm Media
1. Truy cập **Ngân hàng Câu hỏi** > **Thêm câu hỏi mới**.
2. Chọn loại câu hỏi: *Trắc nghiệm 1 đáp án, Trắc nghiệm nhiều đáp án, Đúng/Sai, Nối cột, Tự luận*.
3. Mở mục **Đính kèm Media (Hình ảnh, Video, Audio)** để thêm link ảnh, video YouTube hoặc file audio.
4. Hỗ trợ nhập hàng loạt câu hỏi qua nút **Nhập từ Excel** (file mẫu chuẩn .xlsx).

### 4.3. Quản lý Danh mục, Tìm kiếm & Thao tác Hàng loạt
- **Tìm kiếm**: Ô search tìm nhanh câu hỏi theo nội dung, môn học hoặc thẻ tags.
- **Lọc**: Lọc theo danh mục hoặc theo thể loại câu hỏi.
- **Thao tác hàng loạt**: Chọn các checkbox đầu dòng để:
  - **Gán vào danh mục**: Đưa hàng loạt câu hỏi vào 1 danh mục/chủ đề cụ thể.
  - **Xóa hàng loạt**: Xóa vĩnh viễn nhiều câu hỏi cùng lúc.

### 4.4. Tạo & Cấu hình Đề thi
1. Vào **Quản lý Đề thi** > **Tạo đề thi mới**.
2. Cấu hình các thông số:
   - Thời lượng thi, ngưỡng đạt (%).
   - **Kích hoạt Giám thị AI & Chống gian lận**: Bật để bật camera giám sát AI, tắt để cho phép thi tự do.
   - **Mật khẩu truy cập**: Đặt mật khẩu nếu cần giới hạn thí sinh.
   - Hiển thị kết quả & đáp án sau khi nộp.
3. Sau khi tạo đề, mở nút **Quản lý** để:
   - Thêm câu hỏi vào đề (chọn thủ công hoặc tự động bốc ngẫu nhiên).
   - Phân công giáo viên coi thi (Proctor).
   - Thiết lập khung giờ mở đề thi (Lịch thi).
4. Bấm **Xuất bản đề thi** để mở cho học sinh làm bài.

### 4.5. Chấm bài Tự luận theo từng Đề thi (Manual Grading)
1. Vào mục **Chấm bài tự luận**.
2. Hệ thống hiển thị các đề thi có bài tự luận đang chờ chấm, kèm số lượng bài và số học sinh.
3. Nhấp **Vào chấm bài đề này** để mở không gian chấm bài tập trung: xem nội dung trả lời/ảnh chụp bài viết tay của học sinh, nhập điểm và ghi chú nhận xét.

### 4.6. Giám sát Phòng thi Trực tiếp (Live Proctoring)
- Giám thị mở link coi thi `/proctor/exam/:examId` để theo dõi lưới camera trực tiếp của tất cả thí sinh.
- Nút **Làm mới dữ liệu** hỗ trợ cập nhật danh sách thí sinh tức thì không cần F5.
- Thực hiện kỷ luật phòng thi: Gửi cảnh báo, trừ giờ làm bài, trừ phần trăm điểm hoặc **Cấm thi ngay lập tức**.
- Thí sinh bị cấm thi sẽ bị đá khỏi phòng thi vĩnh viễn và không thể vào lại.

---

## 5. Hướng dẫn dành cho Quản trị viên (Admin)

### 5.1. Dashboard Thống kê Tổng quan
- Theo dõi các chỉ số KPI: Tổng số thí sinh, tổng đề thi, tổng số câu hỏi, lượt thi đã hoàn thành và biểu đồ xu hướng 14 ngày.

### 5.2. Quản lý Người dùng & Nhập Học sinh Hàng loạt từ Excel
1. Vào **Quản lý Người dùng**.
2. Nhấn nút **Nhập từ Excel** > Tải file mẫu chuẩn `.xlsx`.
3. Điền danh sách tài khoản gồm: `tai_khoan`, `ho_ten`, `email`, `mat_khau`, `vai_tro`.
4. Kéo thả file vào hộp thoại để hệ thống tự động tạo hàng loạt tài khoản học sinh.

### 5.3. Thư viện Quản lý Bằng chứng & Hình ảnh Vi phạm Sau thi
1. Vào mục **Ảnh vi phạm sau thi** trên thanh menu.
2. Danh sách các đợt thi vi phạm được nhóm theo: `<Tên bài thi> • <Ngày thi> [<Giờ bắt đầu> - <Giờ kết thúc>]`.
3. Nhấp vào đợt thi để xem chi tiết:
   - Tên thí sinh, mã tài khoản, thời gian vi phạm chính xác đến từng giây.
   - Loại vi phạm (rời tab, quay đầu, phát hiện nhiều người,...).
   - Ảnh chụp bằng chứng từ camera.
   - Nút **Lưu ảnh về máy** để tải ảnh chứng cứ về máy tính.
   - Nút **Xóa** từng ảnh hoặc **Xóa toàn bộ mục bài thi** khi kỳ thi đã kết thúc xử lý.

---

## 6. Cơ chế Giám sát AI & Chống Gian Lận (Web & Desktop Kiosk)

### 6.1. Mô hình Giám sát AI trên Trình duyệt & WebAssembly:
1. **Phát hiện khuôn mặt**: Cảnh báo khi thí sinh rời khỏi góc máy hoặc có từ 2 người trở lên.
2. **Theo dõi hướng nhìn (Gaze/Head Pose)**: Cảnh báo khi thí sinh quay đầu sang trái/phải liên tục.
3. **Phát hiện chuyển tab (Visibility API & Blur)**: Ghi nhận sự kiện khi thí sinh chuyển sang cửa sổ hoặc ứng dụng khác.
4. **Tự động chụp ảnh bằng chứng**: Chụp ảnh ngay tại khoảnh khắc xảy ra vi phạm và lưu vào thư viện bằng chứng của Admin.

### 6.2. Cơ chế Bảo mật Chuyên dụng trên Ứng dụng Desktop (`ExamSystemClient.exe`):
1. **Chế độ Toàn Màn Hình Kiosk Lockdown**: Tự động khóa toàn màn hình, chặn các tổ hợp phím hệ thống nguy hiểm (`Alt+Tab`, `PrintScreen`, `Ctrl+Shift+Esc`, `Alt+F4`, `F11`, `F12`, `Ctrl+R`).
2. **Cưỡng Chế Tắt (Taskkill / Force-shutdown) Phần Mềm Gian Lận**: Quét định kỳ 5 giây, phát hiện các ứng dụng điều khiển từ xa, quay màn hình hoặc bot AI (**UltraViewer, TeamViewer, AnyDesk, Discord, OBS Studio, Zalo, Telegram, ChatGPT Desktop, VMware, VirtualBox...**) và tự động gọi lệnh hệ thống `taskkill /F /IM` để tắt ngay lập tức.
3. **Livestream Màn Hình Máy Tính Thật (Native Screen Streaming)**: Chụp toàn bộ màn hình làm bài của thí sinh và phát trực tiếp về cho Giám thị, giúp quan sát mọi thao tác trên máy tính của thí sinh theo thời gian thực.

---

## 7. Khắc phục Sự cố Thường gặp (FAQ)

- **Q: Trình duyệt không mở được camera?**
  *A: Kiểm tra biểu tượng ổ khóa ở thanh địa chỉ trình duyệt, chọn Cho phép (Allow) Camera.*
- **Q: Thí sinh thi bằng file .exe trên máy tính khác trong mạng LAN như thế nào?**
  *A: Copy nguyên thư mục `frontend/dist-client` sang máy thí sinh. Mở file `ExamSystemClient.exe` để làm bài trực tiếp.*
- **Q: Học sinh bị cấm thi hoặc cần cho thi lại thì làm thế nào?**
  *A: Giám thị/Admin mở hộp thoại Quản lý đề thi > Tab "Thí sinh & Lượt thi" > Bấm nút **"Thi lại"** để reset lượt thi cho thí sinh.*
- **Q: Làm sao để tạo bài kiểm tra không yêu cầu camera?**
  *A: Khi tạo/chỉnh sửa đề thi, tắt công tắc "Kích hoạt Giám thị AI & Chống gian lận".*
