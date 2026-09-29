"""
Gửi email đơn giản qua SMTP. Dự án trước đây chưa có bất kỳ hạ tầng gửi email
nào — đây là lần đầu tích hợp, phục vụ chức năng quên mật khẩu.

Nếu chưa cấu hình biến môi trường SMTP_HOST, hàm sẽ chỉ log ra console thay vì
gửi thật (hữu ích lúc dev/test không cần setup SMTP server thật).
"""
import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@examsystem.local")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost")


def send_password_reset_email(to_email: str, reset_token: str) -> None:
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    subject = "Yêu cầu đặt lại mật khẩu - ExamSystem"
    body = (
        f"Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản ExamSystem gắn với email này.\n\n"
        f"Nhấn vào đường dẫn sau để đặt mật khẩu mới (link có hiệu lực trong 30 phút):\n{reset_link}\n\n"
        f"Nếu bạn không yêu cầu điều này, hãy bỏ qua email này — mật khẩu của bạn vẫn an toàn."
    )

    if not SMTP_HOST:
        # Chưa cấu hình SMTP thật (dev/test) — log ra console để vẫn kiểm tra được luồng.
        logger.warning(
            "SMTP_HOST chưa được cấu hình — không gửi email thật. "
            f"Link đặt lại mật khẩu cho {to_email}: {reset_link}"
        )
        return

    msg = MIMEMultipart()
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            if SMTP_USER and SMTP_PASSWORD:
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to_email], msg.as_string())
    except Exception as e:
        # Không raise lỗi ra ngoài — endpoint quên mật khẩu luôn trả lời thành công
        # (tránh lộ email nào tồn tại trong hệ thống), chỉ log lỗi gửi mail để debug sau.
        logger.error(f"Gửi email đặt lại mật khẩu thất bại tới {to_email}: {e}")
