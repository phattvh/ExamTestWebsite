FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip

COPY requirements.txt .
# Build wheels from cache-first; no dev/test deps in the runtime image -> fast build & small image
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# 4 workers x uvicorn event loop ~= hundreds of concurrent WS/HTTP connections
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
