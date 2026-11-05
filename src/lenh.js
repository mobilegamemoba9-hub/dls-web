// ====== LÁT 5 (05/11): NÚT ĐIỀU KHIỂN AN TOÀN ======
// Web TẠO lệnh ở /web/lenh/m<máy>/<id>  ->  máy Xeon (web_lenh.py) hỏi mỗi 1 phút, KIỂM LẠI điều kiện an toàn, chạy ĐÚNG 1 LẦN
//   ->  ghi kết quả /web/lenh_kq/m<máy>/<id> = { k: ok|tu_choi|het_han|loi, m: lời báo, t: giờ, l, tab }  ->  xóa lệnh.
// Lệnh quá 10 phút máy chưa chạy -> máy báo "hết hạn". Web chỉ đọc kết quả khi CÓ lệnh đang chờ (mỗi 30 giây) hoặc lúc mở trang Máy.
import { useCallback, useEffect, useRef, useState } from "react";
import { readWeb, writeLenh } from "./firebase.js";

export const HAN_MS = 10 * 60 * 1000;     // máy: quá 10 phút -> hết hạn
const CHO_TOI_DA_MS = HAN_MS + 3 * 60 * 1000;   // + 1 chu kỳ hỏi 1 phút + trễ -> sau mốc này web thôi chờ
const HOI_KQ_MS = 30000;
const LS = "web3:lenh_cho";

// Mô tả 8 lệnh máy cho phép (trùng danh sách CHO_PHEP trong web_lenh.py)
export const LOAI = {
  mo_khoa: { l: "Mở khóa tab", g: "Cho Agent tạo lại acc mới trên tab NEW bị khóa vì tạo acc lỗi" },
  go_dirty: { l: "Gỡ cờ DIRTY", g: "Báo tab ĐÃ xóa + clone xong, Agent được dùng lại" },
  dat_dirty: { l: "Đặt lại cờ DIRTY", g: "Agent KHÔNG dùng tab này (hoàn tác gỡ cờ)" },
  ngay_bu: { l: "Ngày bù", g: "Cộng / trừ ngày bù cho gói theo ngày đang chạy" },
  dong_goi: { l: "Đóng gói đã dừng", g: "Gói đã dừng (KICK / CANCEL / dừng) -> đã đóng" },
  mo_lai_goi: { l: "Mở lại gói", g: "Hoàn tác đóng gói: trả gói về trạng thái cũ" },
  tam_dung: { l: "Tạm dừng bot", g: "Bot nhả cần di chuyển và đứng yên (như nút ⏸ Dashboard) - không tắt bot, không tắt LD" },
  chay_tiep: { l: "Tiếp tục bot", g: "Bot chạy tiếp (như nút ▶ Dashboard)" },
};
export const KQ = {
  cho: { l: "Đang chờ máy", tone: "run" },
  ok: { l: "Đã làm", tone: "ok" },
  tu_choi: { l: "Máy từ chối", tone: "warn" },
  het_han: { l: "Hết hạn", tone: "off" },
  loi: { l: "Lỗi", tone: "err" },
  mat: { l: "Không thấy kết quả", tone: "err" },
};

const lsGet = () => { try { const v = JSON.parse(localStorage.getItem(LS) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const lsSet = (v) => { try { localStorage.setItem(LS, JSON.stringify(v)); } catch { /* bị chặn: chỉ mất danh sách chờ khi tải lại trang */ } };

export function newId() {
  const r = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => (b % 36).toString(36)).join("");
  return "L" + Date.now().toString(36) + r;
}

// Hoàn tác gợi ý cho 1 kết quả ok -> lệnh ngược (hoặc null)
export function hoanTac(x) {
  if (!x || x.k !== "ok") return null;
  if (x.l === "go_dirty") return { l: "dat_dirty", tab: x.tab };
  if (x.l === "dong_goi" && x.p != null) return { l: "mo_lai_goi", tab: x.tab, p: x.p };
  if (x.l === "tam_dung") return { l: "chay_tiep", tab: x.tab, p: x.p };
  if (x.l === "chay_tiep" && x.p != null) return { l: "tam_dung", tab: x.tab, p: x.p };
  if (x.l === "ngay_bu" && x.p != null && Number.isFinite(+x.so)) return { l: "ngay_bu", tab: x.tab, p: x.p, so: -x.so };
  return null;
}

// Lệnh + kết quả của 1 máy. m = số máy (10), bat = máy có bản nút (05/11d) và đang gửi dữ liệu
export function useLenh(m, bat) {
  const [cho, setCho] = useState(() => lsGet());
  const [kq, setKq] = useState({});
  const [loi, setLoi] = useState("");
  const dangDoc = useRef(false);
  const choM = cho.filter((x) => x.m === m);
  const conCho = choM.some((x) => !kq[x.id] && Date.now() - x.at < CHO_TOI_DA_MS);

  const docKq = useCallback(async () => {
    if (m == null || dangDoc.current) return;
    dangDoc.current = true;
    try { setKq((await readWeb(`lenh_kq/m${m}`)) || {}); setLoi(""); }
    catch (e) { setLoi("Chưa đọc được kết quả lệnh (" + ((e && (e.code || e.message)) || "lỗi mạng") + ")"); }
    finally { dangDoc.current = false; }
  }, [m]);

  useEffect(() => { setKq({}); if (bat) docKq(); }, [m, bat, docKq]);          // mở trang máy: đọc kết quả 1 lần
  useEffect(() => {                                                       // có lệnh chờ: đọc lại mỗi 30 giây (chỉ khi trang đang hiện)
    if (!conCho) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") docKq(); }, HOI_KQ_MS);
    return () => clearInterval(id);
  }, [conCho, docKq]);
  useEffect(() => {                                                       // dọn danh sách chờ: bỏ lệnh đã có kết quả / quá 1 ngày
    const giu = cho.filter((x) => (x.m !== m || !kq[x.id]) && Date.now() - x.at < 86400000);
    if (giu.length !== cho.length) { setCho(giu); lsSet(giu); }
  }, [kq]);

  const gui = useCallback(async (d) => {
    const id = newId();
    const lenh = { l: d.l, tab: d.tab, ...(d.p != null ? { p: d.p } : {}), ...(d.so != null ? { so: d.so } : {}), ai: d.ai || "" };
    await writeLenh(m, id, lenh);
    const x = { id, m, ...lenh, at: Date.now() };
    setCho((o) => { const n = [...o, x]; lsSet(n); return n; });
    return id;
  }, [m]);

  // danh sách hiện: lệnh chờ của máy này + kết quả gần nhất (mới nhất trên)
  const now = Date.now();
  const rows = [];
  const seen = new Set();
  for (const x of choM) {
    seen.add(x.id);
    const r = kq[x.id];
    rows.push(r ? { id: x.id, ...r, p: x.p, so: x.so, t: (r.t || 0) * 1000 || x.at }
      : { id: x.id, k: now - x.at < CHO_TOI_DA_MS ? "cho" : "mat", l: x.l, tab: x.tab, p: x.p, so: x.so, t: x.at,
          m: now - x.at < CHO_TOI_DA_MS ? `Máy hỏi lệnh mỗi 1 phút · gửi ${Math.max(0, Math.round((now - x.at) / 1000))} giây trước` : "Máy không báo lại sau 13 phút: Agent tắt / bản cũ / mất mạng?" });
  }
  for (const [id, r] of Object.entries(kq)) if (!seen.has(id) && r && typeof r === "object") rows.push({ id, ...r, t: (r.t || 0) * 1000 });
  rows.sort((a, b) => b.t - a.t);
  return { rows: rows.slice(0, 12), gui, docKq, loi, conCho };
}
