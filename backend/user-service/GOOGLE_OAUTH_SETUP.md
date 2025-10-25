# Hướng dẫn cài đặt Google OAuth cho User Service

## 1. Cài đặt dependencies

Chạy lệnh sau trong thư mục `backend/user-service`:

```bash
npm install passport passport-google-oauth20 express-session
```

## 2. Cấu hình Google OAuth Console

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Kích hoạt Google+ API
4. Tạo OAuth 2.0 credentials:
   - Application type: Web application
   - **Authorized JavaScript origins:** `http://localhost:5173` (Frontend)
   - **Authorized redirect URIs:** `http://localhost:3000/api/auth/google/callback` (API Gateway)

## 3. Cấu hình Environment Variables

Thêm các biến môi trường sau vào file `.env`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Session
SESSION_SECRET=your-session-secret

# Frontend URL (để redirect sau khi đăng nhập)
FRONTEND_URL=http://localhost:5173
```

## 4. Cách sử dụng

### Frontend Integration

Để tích hợp với frontend, bạn có thể:

1. **Redirect đến Google OAuth:**
```javascript
window.location.href = 'http://localhost:3000/api/auth/google';
```

2. **Xử lý callback trong frontend:**
Tạo một route `/auth/callback` trong frontend để xử lý redirect từ backend:

```typescript
// Trong React component
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const success = urlParams.get('success');
  
  if (success === 'true' && token) {
    // Lưu token vào localStorage hoặc state management
    localStorage.setItem('token', token);
    // Redirect đến trang chính
    window.location.href = '/';
  } else if (success === 'false') {
    // Xử lý lỗi đăng nhập
    console.error('Google authentication failed');
  }
}, []);
```

## 5. API Endpoints (qua API Gateway)

- `GET http://localhost:3000/api/auth/google` - Bắt đầu quá trình đăng nhập Google
- `GET http://localhost:3000/api/auth/google/callback` - Callback từ Google (tự động redirect)
- `GET http://localhost:3000/api/auth/google/failure` - Xử lý lỗi đăng nhập

**Lưu ý**: Tất cả endpoints đều đi qua API Gateway (port 3000), không trực tiếp đến user-service (port 3001).

## 6. Lưu ý quan trọng

1. **Production**: Thay đổi `GOOGLE_CALLBACK_URL` và `FRONTEND_URL` cho production
2. **Security**: Sử dụng HTTPS trong production
3. **Session Secret**: Sử dụng secret mạnh cho SESSION_SECRET
4. **Database**: User model đã được cập nhật để hỗ trợ Google OAuth users
5. **Protocol**: Đảm bảo sử dụng `http://` cho development, `https://` cho production
6. **URI Matching**: Google OAuth URIs phải khớp chính xác với cấu hình trong Console

## 7. Testing

1. Khởi động API Gateway: `npm run dev` (trong thư mục api-gateway)
2. Khởi động User Service: `npm run dev` (trong thư mục user-service)
3. Truy cập: `http://localhost:3000/api/auth/google`
4. Đăng nhập bằng Google account
5. Kiểm tra redirect về frontend với token

**Flow hoạt động:**
1. Frontend → API Gateway (3000) → User Service (3001) → Google OAuth
2. Google → API Gateway (3000) → User Service (3001) → Frontend (5173)
