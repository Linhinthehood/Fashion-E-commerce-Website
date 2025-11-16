## Câu hỏi & Giải thích về Recommendation (Phong cách học sinh lớp 5)

---

### 1) Vì sao người dùng mới không thấy gợi ý “có gu” ngay?
- User mới chưa có hành vi (events) trong hệ thống.
- API `retrieve/personalized` sẽ rơi vào chế độ **fallback**: dùng điểm **phổ biến** (popularity) để gợi ý.
- Vẫn thấy mục “Gợi ý cho bạn”, nhưng danh sách giống nhau cho mọi user mới.
- Khi user bắt đầu xem / thêm giỏ / mua, sự kiện được lưu → lần gọi tiếp theo sẽ “cá nhân hóa” hơn.

---

### 2) Điểm similarity / popularity / affinity được tính thế nào?
- **Similarity (điểm giống nhau)**: tìm tối đa 50 món “na ná” các món bạn vừa xem → lấy điểm cao nhất cho mỗi sản phẩm → chuẩn hóa về 0–1.
- **Popularity (điểm phổ biến)**: đếm xem món đó được view/add-to-cart/purchase bao nhiêu lần trong toàn hệ thống (trọng số 1/3/5…) → chuẩn hóa 0–1.
- **Affinity (điểm hợp gu)**: chỉ đếm event của user hiện tại với từng món (cũng dùng trọng số 1/3/5…) → chuẩn hóa 0–1.
- Điểm cuối: `HybridScore = α × Similarity + β × Popularity + γ × Affinity`.
- α, β, γ tùy chiến lược (Content‑Focused, Trending‑Focused, Personalization‑Focused). Tổng luôn = 1.

---

### 3) Vì sao `recentItemIds` quan trọng?
- API cần ít nhất 1 “seed” sản phẩm để chạy FAISS và tính similarity.
- Nếu gửi `recentItemIds: []`, hàm fallback: chỉ dùng popularity → similarity và affinity = 0.
- Để có similarity/affinity khác 0: gọi `GET /api/events/recent-items?userId=...` lấy seed và truyền vào request.

---

### 4) Khi nào CTR / Add-to-Cart / Conversion được tính cho A/B testing?
- Chỉ khi event có `context.source = 'recommendation'` và `context.strategy = ...`.
- User phải nhìn thấy recommendation (`impression`) rồi click/add-to-cart/purchase ngay trên card recommendation.
- Nếu user tự lục product page và mua, chiến lược không được cộng điểm (vì không phải nhờ recommendation).

---

### 5) Tại sao một vài event có `strategy = unknown`?
- Thường xảy ra khi FE emit impression/view mà không kèm `context.strategy`.
- Ví dụ: hiển thị trending products fallback NF → FE không truyền strategy → backend gộp vào nhóm `unknown`.
- Cách khắc phục: cố định strategy cho những block này (ví dụ `popularity-only`), hoặc ẩn “unknown” trên dashboard.

---

### 6) Tại sao Dashboard A/B hiển thị tên chiến lược đúng?
- FE map `hybrid-alpha...` → tên `Content/Trending/Personalization`.
- Nếu chuỗi mới toán (ví dụ ít thập phân) vẫn map được vì so sánh α/β/γ với sai số nhỏ.
- Các chiến lược không xác định sẽ bị ẩn khỏi bảng.

---

### 7) Những câu hỏi giảng viên có thể hỏi (và câu trả lời ngắn)

1. **Làm sao hệ thống chọn 8 sản phẩm gợi ý?**  
   `HybridScore = α × Similarity + β × Popularity + γ × Affinity`, xếp giảm dần, lấy top 8.

2. **Lấy similarity như thế nào?**  
   Với mỗi sản phẩm user xem → FAISS trả về 50 món giống nhất → giữ điểm cao nhất cho mỗi món → chuẩn hóa 0–1.

3. **Popularity/Affinity đến từ đâu?**  
   Order-service aggregations:  
   `score = 1 × view + 3 × add_to_cart + 5 × purchase (+ 2 × wishlist)`. Popularity dùng toàn bộ event, affinity dùng event của riêng user.

4. **Vì sao người mới vẫn có recommend?**  
   Fallback dùng popularity. Khi user có event, hệ thống tự nâng cấp sang cá nhân hóa.

5. **RecentItemIds là gì?**  
   Danh sách sản phẩm user vừa xem/thêm giỏ/mua. Lấy bằng API `/api/events/recent-items`, truyền vào request để tính similarity.

6. **Chiến lược A/B hiển thị sai tên?**  
   FE map `hybrid-alpha...` → tên. “Unknown” do thiếu `context.strategy`, nên ẩn/đặt tên mặc định.

7. **Làm sao đo chiến thắng của 1 strategy?**  
   Dashboard A/B: so CTR, ATC Rate, Conversion Rate, Revenue/Impression. Strategy nào cao hơn thì ưu tiên.

---

### 8) Một số gợi ý trình bày khi demo
- Cho thấy `recent-items` rỗng → fallback popularity, sau đó xem vài món → gọi lại API → thấy similarity/affinity tăng.
- Vào Dashboard để xem số liệu A/B (Tên chiến lược, CTR, Revenue/Impression).
- Giải thích `breakdown` trong response API để giảng viên thấy công thức hoạt động thực tế.


