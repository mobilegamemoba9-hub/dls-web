# QUẢN LÍ HỆ THỐNG

Trang theo dõi máy, đơn và doanh thu (React 19 + Vite + Tailwind 4). GitHub Actions tự build và đăng lên GitHub Pages khi nhánh `main` đổi.

- Dữ liệu: Firebase Realtime Database, chỉ nhánh `/web`, đọc sau khi đăng nhập Google. Luật Firebase quyết định ai đọc được.
- `src/firebase-config.js`: cấu hình Web App (công khai được, không phải mật khẩu) + danh sách tài khoản được vào. **Không bao giờ** đưa database secret hay khóa của tool vào kho này.
- Chưa có dữ liệu thật thì trang hiện **Dữ liệu mẫu** (`src/data.js`).
