// CẤU HÌNH FIREBASE CHO WEB (công khai được - KHÔNG phải mật khẩu; dữ liệu được bảo vệ bằng Luật Firebase + đăng nhập Google).
// TUYỆT ĐỐI không dán database secret / khóa của tool vào file này.
// firebaseConfig = null  -> trang chạy "Dữ liệu mẫu", không đăng nhập (dùng khi chưa có Web App).
export const firebaseConfig = null;

// Chỉ các tài khoản này được vào trang. UID lấy ở màn hình sau khi đăng nhập lần đầu (có nút chép).
// Đây chỉ là "cửa trước" cho đẹp; khóa THẬT là Luật Firebase cho nhánh /web (chỉ UID này đọc/ghi).
export const ALLOWED = {
  uids: [],
  emails: ["mobilegamemoba9@gmail.com", "dlschanh@gmail.com"],
};
