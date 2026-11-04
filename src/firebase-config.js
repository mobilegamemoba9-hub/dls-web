// CẤU HÌNH FIREBASE CHO WEB (công khai được - KHÔNG phải mật khẩu; dữ liệu được bảo vệ bằng Luật Firebase + đăng nhập Google).
// TUYỆT ĐỐI không dán database secret / khóa của tool vào file này.
// firebaseConfig = null  -> trang chạy "Dữ liệu mẫu", không đăng nhập (dùng khi chưa có Web App).
export const firebaseConfig = {
  apiKey: "AIzaSyAzivBX2IlwbAlxjeTDCBr7TbIWLXdO4I4",
  authDomain: "mh-dls-bus.firebaseapp.com",
  databaseURL: "https://mh-dls-bus-default-rtdb.firebaseio.com",
  projectId: "mh-dls-bus",
  storageBucket: "mh-dls-bus.firebasestorage.app",
  messagingSenderId: "1055988843869",
  appId: "1:1055988843869:web:81f3018559b7dd13bc94b4",
};

// Chỉ các tài khoản này được vào trang. UID lấy ở màn hình sau khi đăng nhập lần đầu (có nút chép).
// Đây chỉ là "cửa trước" cho đẹp; khóa THẬT là Luật Firebase cho nhánh /web (chỉ UID này đọc/ghi).
export const ALLOWED = {
  uids: ["K5iiwtENTfZou9vMuvfSRMUDTPZ2", "lTVVRCo2wOWrpUQwuiwW84wcy8v1"],
  emails: ["mobilegamemoba9@gmail.com", "dlschanh@gmail.com"],
};
