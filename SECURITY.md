# Bảo mật

## Quy tắc xử lý secret

- **Không bao giờ commit** file `.env`, cert/key SSL, hoặc bất kỳ giá trị bí mật nào (mật khẩu DB, `JWT_SECRET`,...) lên Git. Chỉ commit file mẫu (`.env.example`) với giá trị placeholder.
- File secret hợp lệ bị `.gitignore` chặn: `.env`, `.env.*` (trừ `.env.example`), `nginx/ssl/`.
- SSL cert dev (`nginx/ssl/*.pem`) là **self-signed, chỉ dùng cho localhost** — mỗi máy tự tạo bằng `python scripts/generate_ssl.py`, không chia sẻ/commit file cert dùng chung.
- Trước khi `git add`, kiểm tra `git status` không có file `.env` hay `*.pem` nằm trong danh sách staged.

## Sự cố đã xử lý

**[2026-08-09]** Phát hiện `nginx/ssl/cert.pem` và `nginx/ssl/key.pem` (SSL private key tự ký cho `localhost`) đã bị commit vào lịch sử Git dù `.gitignore` đã có dòng `nginx/ssl/` — khả năng bị add trước khi gitignore có hiệu lực, hoặc bị `git add -f`. Đồng thời phát hiện thư mục `node_modules/` ở gốc repo cũng bị commit nhầm.

**Đã xử lý:**
- Xoá 2 file cert/key và thư mục `node_modules/` khỏi working tree và khỏi Git tracking (`git rm --cached`).
- Sửa `scripts/generate_ssl.py` (trước đó hardcode đường dẫn Windows `d:\ExamTestWebsite\...`, không chạy được trên máy khác) để mỗi máy tự sinh cert cục bộ bằng đường dẫn tương đối.

**Lưu ý còn tồn đọng:** việc `git rm --cached` chỉ ngăn các commit **sau này** chứa lại file, nhưng **không xoá** file khỏi lịch sử Git đã có (`c9a320b` và các commit sau nếu có). Vì đây là cert self-signed cho localhost (không phải secret production thật, rủi ro thực tế thấp), mức độ ưu tiên xử lý không cấp bách; tuy nhiên nếu cần dọn sạch lịch sử, cân nhắc:

```bash
# Dùng git-filter-repo (khuyến nghị hơn filter-branch)
pip install git-filter-repo
git filter-repo --path nginx/ssl/key.pem --path nginx/ssl/cert.pem --invert-paths
git filter-repo --path node_modules --invert-paths
# Sau đó force-push lại toàn bộ nhánh — LƯU Ý: thao tác này viết lại lịch sử,
# mọi người cùng làm việc trên repo cần clone lại sau khi force-push.
```

## Báo cáo lỗ hổng

Nếu phát hiện vấn đề bảo mật khác trong dự án, ưu tiên báo trực tiếp cho chủ repo thay vì mở issue công khai (đặc biệt nếu liên quan tới secret đã lộ hoặc lỗ hổng xác thực).
