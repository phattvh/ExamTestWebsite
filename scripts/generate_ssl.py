import socket
from datetime import datetime, timedelta
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import os

import socket
from datetime import datetime, timedelta
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import os

key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)
subject = issuer = x509.Name([
    x509.NameAttribute(NameOID.COMMON_NAME, u"localhost"),
])
cert = x509.CertificateBuilder().subject_name(
    subject
).issuer_name(
    issuer
).public_key(
    key.public_key()
).serial_number(
    x509.random_serial_number()
).not_valid_before(
    datetime.utcnow()
).not_valid_after(
    datetime.utcnow() + timedelta(days=365)
).add_extension(
    x509.SubjectAlternativeName([x509.DNSName(u"localhost")]),
    critical=False,
).sign(key, hashes.SHA256())

# Đường dẫn tương đối tính từ vị trí script này (scripts/generate_ssl.py -> nginx/ssl/)
# thay vì hardcode "d:\ExamTestWebsite\..." để chạy được trên mọi hệ điều hành.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SSL_DIR = os.path.join(SCRIPT_DIR, "..", "nginx", "ssl")
os.makedirs(SSL_DIR, exist_ok=True)

key_path = os.path.join(SSL_DIR, "key.pem")
cert_path = os.path.join(SSL_DIR, "cert.pem")

with open(key_path, "wb") as f:
    f.write(key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    ))
with open(cert_path, "wb") as f:
    f.write(cert.public_bytes(serialization.Encoding.PEM))

print(f"✅ Đã tạo self-signed SSL cert (dev only) tại:\n  - {key_path}\n  - {cert_path}")
