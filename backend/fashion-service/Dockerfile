
FROM python:3.9-slim


WORKDIR /app


RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .


RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt


COPY . .

# 7. Tạo thư mục data và User quyền hạn thấp (Security)
RUN mkdir -p /app/data && \
    addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser && \
    chown -R appuser:appgroup /app

# Chuyển sang user thường
USER appuser

# 8. Mở cổng (Giữ nguyên 3008 như ngài muốn)
EXPOSE 3008

HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3008/health || exit 1


CMD ["python", "-u", "main.py"]