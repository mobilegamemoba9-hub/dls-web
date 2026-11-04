// Kết nối Firebase cho web: đăng nhập Google + đọc nhánh /web của Realtime Database.
// Web CHỈ đọc /web (nhánh riêng cho web). Không đụng /assign /ack /result /tabs /beat của tool.
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";
import { firebaseConfig, ALLOWED } from "./firebase-config.js";

let app = null;
export const configured = !!(firebaseConfig && firebaseConfig.apiKey);

function init() {
  if (!configured) return null;
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

export function watchUser(cb) {
  const a = init();
  if (!a) { cb(null); return () => {}; }
  return onAuthStateChanged(getAuth(a), cb);
}

export async function login() {
  const auth = getAuth(init());
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    // điện thoại / trình duyệt chặn cửa sổ bật lên -> chuyển trang đăng nhập
    if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

export const logout = () => signOut(getAuth(init()));

export function allowed(user) {
  if (!user) return false;
  const uids = ALLOWED.uids || [];
  const emails = (ALLOWED.emails || []).map((x) => x.toLowerCase());
  if (!uids.length && !emails.length) return true;          // chưa khai danh sách -> cho vào để lấy UID (luật Firebase vẫn chặn dữ liệu)
  return uids.includes(user.uid) || (!!user.email && user.emailVerified && emails.includes(user.email.toLowerCase()));
}

// Đọc 1 lần (không mở kết nối nghe liên tục) -> chỉ tải khi trang đang hiện + mỗi 2 phút / bấm Làm mới.
export async function readWeb(path) {
  const snap = await get(ref(getDatabase(init()), "/web/" + path));
  return snap.exists() ? snap.val() : null;
}

export function loginError(e) {
  const c = (e && e.code) || "";
  if (c === "auth/unauthorized-domain") return "Tên miền trang này chưa có trong Firebase → Authentication → Settings → Authorized domains.";
  if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return "Bạn đã đóng cửa sổ đăng nhập. Bấm lại để thử.";
  if (c === "auth/operation-not-allowed") return "Chưa bật đăng nhập Google trong Firebase → Authentication → Sign-in method.";
  if (c === "auth/network-request-failed") return "Mất mạng. Kiểm tra kết nối rồi thử lại.";
  return "Đăng nhập không được (" + (c || "lỗi lạ") + ").";
}
