# Laundry Hub Project

Dự án gồm 2 phần: Backend (Spring Boot 3) và Frontend (React + Vite + Tailwind CSS).

## Yêu cầu hệ thống (Prerequisites)
- **Java 17+**
- **Maven 3.x**
- **Node.js 18+** & **npm**
- **PostgreSQL 14+**

---

## 1. Cấu hình Database
Trước khi chạy Backend, bạn cần tạo Database trên PostgreSQL.
1. Khởi động PostgreSQL server trên máy của bạn.
2. Mở công cụ quản lý (như pgAdmin, DBeaver) hoặc dùng CLI (psql).
3. Tạo Database tên là `laundry_db`:
   ```sql
   CREATE DATABASE laundry_db;
   ```
4. Mặc định Backend cấu hình sử dụng user `postgres` và mật khẩu `password`. Nếu cấu hình máy bạn khác, hãy cập nhật lại thông tin này tại file: 
   `backend/src/main/resources/application.yml`

---

## 2. Khởi chạy Backend (Spring Boot)
Mở một terminal mới tại thư mục gốc của dự án (`laundry-hub`) và chạy các lệnh:

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt các dependencies và build source code
mvn clean install -DskipTests

# Khởi chạy server Spring Boot
mvn spring-boot:run
```

- Backend sẽ khởi động và chạy tại: **http://localhost:8080**
- API Health check kiểm tra trạng thái: **http://localhost:8080/api/v1/health**

---

## 3. Khởi chạy Frontend (React Vite)
Mở thêm một terminal **mới** (giữ nguyên terminal của Backend đang chạy) tại thư mục gốc của dự án và chạy các lệnh:

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt các thư viện Node.js
npm install

# Khởi chạy dev server của Vite
npm run dev
```

- Frontend sẽ khởi động và chạy tại: **http://localhost:5173**
- Khi truy cập vào link trên trình duyệt, Frontend sẽ tự động fetch API `/api/v1/health` (thông qua proxy của Vite) để kiểm tra và hiển thị trạng thái kết nối với Backend.

---

## Xử lý sự cố thường gặp (Troubleshooting)
- **Lỗi kết nối Database (Connection Refused / FATAL: password authentication failed):** 
  Kiểm tra lại xem PostgreSQL đã chạy chưa, hoặc thông tin username/password trong `application.yml` có khớp với database thật không.
- **Lỗi cổng 8080 đã được sử dụng (Port in use):** 
  Nếu có ứng dụng khác đang dùng cổng 8080, hãy đổi port của backend trong file `application.yml` (ví dụ `server.port: 8081`). Đừng quên đổi lại cả `target` proxy trong file `frontend/vite.config.js`.
- **Giao diện Frontend báo "Mất kết nối Backend":** 
  Đảm bảo bạn đã chạy Backend thành công ở một cửa sổ terminal khác và không có lỗi nào văng ra.
