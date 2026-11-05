// Kết nối Firebase cho web: đăng nhập Google + đọc/ghi nhánh /web của Realtime Database.
// Web CHỈ dùng /web. ĐỌC mọi nhánh /web; GHI chỉ chỗ Trọng sửa: /web/sua /web/gia /web/cfg /web/don_tay /web/don_cu /web/cong_no /web/ver.
// (lát 5) + /web/lenh/m<máy>/<id> = 1 lệnh nút điều khiển (writeLenh, chỉ TẠO mới, không sửa/xóa).
// KHÔNG ghi /web/may /web/don /web/don_idx /web/so /web/canh_bao /web/nha (máy gửi). Không đụng /assign /ack /result /tabs /beat của tool.
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { getDatabase, ref, get, update, set, serverTimestamp } from "firebase/database";
import { firebaseConfig, ALLOWED } from "./firebase-config.js";

let app = null;
// Chế độ thử (chỉ dùng khi kiểm tra trang trên máy, không có Firebase): window.__WEB_MOCK__ = { may: {...}, nha: {...}, ... }
const MOCK = typeof window !== "undefined" ? window.__WEB_MOCK__ : null;
export const mock = !!MOCK;
export const configured = !mock && !!(firebaseConfig && firebaseConfig.apiKey);

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
const viaMock = (path) => path.split("/").filter(Boolean).reduce((o, k) => (o == null ? null : o[k] ?? null), MOCK);
export async function readWeb(path) {
  if (mock) return structuredClone(viaMock(path));
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

// Ghi nhiều chỗ trong /web cùng lúc (1 lần, tất cả hoặc không). paths: { "sua/o12/rev": "1.5$", "ver/sua": 123 }.
const CHO_GHI = /^(sua|gia|cfg|don_tay|don_cu|cong_no|ver)(\/|$)/;
export async function writeWeb(paths) {
  for (const k of Object.keys(paths)) if (!CHO_GHI.test(k)) throw new Error("web không được ghi " + k);
  if (mock) {
    for (const [k, v] of Object.entries(paths)) {
      const ks = k.split("/"); let o = MOCK;
      for (const x of ks.slice(0, -1)) o = o[x] ??= {};
      if (v === null) delete o[ks.at(-1)]; else o[ks.at(-1)] = structuredClone(v);
    }
    return;
  }
  await update(ref(getDatabase(init()), "/web"), paths);
}

// (lát 5) Gửi 1 lệnh nút điều khiển: TẠO /web/lenh/m<máy>/<id>. Giờ tạo = giờ máy chủ Firebase (máy Xeon tính hạn 10 phút theo giờ này).
// Máy Xeon tự kiểm điều kiện an toàn rồi mới chạy; web không sửa / xóa lệnh (máy xóa sau khi chạy), không ghi nhánh khác.
const LENH_ID = /^L[0-9a-z]{6,30}$/;
export async function writeLenh(m, id, d) {
  if (!Number.isInteger(m) || m < 0 || !LENH_ID.test(id)) throw new Error("lệnh sai dạng");
  const path = `lenh/m${m}/${id}`;
  if (mock) {
    const o = ((MOCK.lenh ??= {})[`m${m}`] ??= {});
    o[id] = { ...structuredClone(d), tao: Date.now() };
    return;
  }
  await set(ref(getDatabase(init()), "/web/" + path), { ...d, tao: serverTimestamp() });
}
