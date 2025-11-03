# Hướng Dẫn Nhanh Chạy Fashion Service

## 🚀 Chạy Service Lần Đầu

### Bước 1: Tạo Virtual Environment (Chỉ cần làm 1 lần)
```bash
cd backend/fashion-service
python3 -m venv venv
```

### Bước 2: Kích Hoạt Virtual Environment
```bash
source venv/bin/activate
```

### Bước 3: Cài Đặt Dependencies (Chỉ cần làm 1 lần)
```bash
pip install -r requirements.txt
```

### Bước 4: Chạy Service
```bash
python main.py
```

Service sẽ chạy tại: **http://localhost:3008**

---

## 🎯 Chạy Service Lần Sau

Mỗi lần mở terminal mới, chỉ cần:

```bash
cd backend/fashion-service
source venv/bin/activate
python main.py
```

---

## 🔍 Kiểm Tra Service Có Đang Chạy

```bash
curl http://localhost:3008/health
```

Bạn sẽ thấy response:
```json
{
  "status": "healthy",
  "service": "recommend-service",
  "version": "1.0.0",
  "mode": "hybrid",
  "indexed_products": 40,
  "device": "cpu"
}
```

---

## 🛑 Dừng Service

### Cách 1: Trong Terminal Đang Chạy Service
Nhấn: **Ctrl + C**

### Cách 2: Từ Terminal Khác
```bash
# Tìm process ID
lsof -ti:3008

# Dừng process
kill <PID>

# Hoặc dừng trực tiếp
lsof -ti:3008 | xargs kill
```

### Cách 3: Kiểm Tra và Dừng Tất Cả
```bash
# Xem tất cả process đang chạy
ps aux | grep "python main.py" | grep -v grep

# Dừng tất cả fashion service
pkill -f "python main.py"
```

---

## 📝 Các Lệnh Hữu Ích

### Xem Logs (nếu chạy background)
```bash
tail -f fashion-service.log
```

### Kiểm tra Port đang sử dụng
```bash
lsof -ti:3008
```

### Chạy Background
```bash
source venv/bin/activate
nohup python main.py > fashion-service.log 2>&1 &
```

### Xem Process
```bash
ps aux | grep "python main.py" | grep -v grep
```

---

## ⚙️ Cấu Hình

Tạo file `.env` nếu muốn thay đổi cấu hình mặc định:

```env
RECOMMEND_SERVICE_PORT=3008
PRODUCT_SERVICE_URL=http://localhost:3002
FASHION_MODEL_PATH=models/fashion_clip_best.pt
FAISS_INDEX_PATH=models/cloud_gallery_ip.index
NPZ_PATH=models/cloud_gallery_embeddings.npz
```

---

## ❗ Lưu Ý

1. **Product Service phải chạy**: Fashion service cần Product Service chạy tại port 3002
2. **Model files**: Đảm bảo các file trong `models/` đã có sẵn
3. **Virtual Environment**: Luôn nhớ kích hoạt venv trước khi chạy
4. **Python Version**: Cần Python 3.8+

---

## 🐛 Xử Lý Lỗi

### Module not found
```bash
# Đảm bảo venv đã được kích hoạt
source venv/bin/activate

# Cài lại dependencies
pip install -r requirements.txt
```

### Model file not found
```bash
# Kiểm tra file models/fashion_clip_best.pt có tồn tại
ls -lh models/
```

