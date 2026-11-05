// Nhập ĐƠN CŨ 1 lần từ file CSV của tab "BACKUP 2026" (Google Sheet → Tệp → Tải xuống → .csv).
// Cột: A ĐƠN, B TÌNH TRẠNG, C GHI CHÚ, D NGÀY THUÊ (dd/mm/yyyy), E/F (công thức, bỏ), G DOANH THU. Dòng tổng tiền (không có tên đơn) bị bỏ.
import { normName, stFromSheet } from "./store.js";

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  const s = String(text || "").replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"' && cell === "") q = true;              // ngoặc kép chỉ mở ô khi ở đầu ô (đúng chuẩn CSV)
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const fnv = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
const ngay = (v) => {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(String(v || ""));
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = +m[3];
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};
const giaSach = (v) => String(v || "").trim().replace(/\s+/g, "");

// -> { list: [{id, n, b, c, d, r}], bo: số dòng bỏ, loi: chữ lỗi | "" }
export function docSheet(text) {
  const rows = parseCsv(text);
  const hi = rows.findIndex((r) => r.some((c) => /^\s*ĐƠN\s*$/i.test(c)) && r.some((c) => /NGÀY\s*THUÊ/i.test(c)));
  if (hi < 0) return { list: [], bo: 0, loi: "Không thấy dòng tiêu đề (ĐƠN … NGÀY THUÊ). Hãy tải đúng tab BACKUP 2026 dạng .csv." };
  const H = rows[hi].map((c) => c.trim().toUpperCase());
  const col = (re, def) => { const i = H.findIndex((c) => re.test(c)); return i >= 0 ? i : def; };
  const cN = col(/^ĐƠN$/, 0), cB = col(/TÌNH TRẠNG/, 1), cC = col(/GHI CHÚ/, 2), cD = col(/NGÀY THUÊ/, 3), cG = col(/^DOANH THU$/, 6);
  const list = [], dem = {};
  let bo = 0;
  for (const r of rows.slice(hi + 1)) {
    const n = String(r[cN] || "").trim();
    const d = ngay(r[cD]);
    if (!n || !d) { if (r.some((c) => String(c).trim())) bo++; continue; }
    const base = "c" + fnv(normName(n) + "|" + d);
    dem[base] = (dem[base] || 0) + 1;
    const id = dem[base] > 1 ? `${base}_${dem[base]}` : base;
    const x = { id, n: n.slice(0, 100), d };
    const b = String(r[cB] || "").trim(), c = String(r[cC] || "").trim(), g = giaSach(r[cG]);
    if (b) x.b = b.slice(0, 30);
    if (c) x.c = c.slice(0, 200);
    if (g && g !== "0" && /\d/.test(g)) x.r = g.slice(0, 20);
    list.push(x);
  }
  return { list, bo, loi: list.length ? "" : "File không có dòng đơn nào hợp lệ." };
}

// Ghép với đơn đã có trên web (đơn tự động / đơn tay cùng tên): KHÔNG thêm vào đơn cũ, chỉ chép giá / ghi chú / Đã Xong sang chỗ sửa nếu đơn đó chưa có.
// orders = buildOrders hiện tại. -> { patch (để save), them: số đơn cũ thêm, ghep: số đơn khớp }
export function keHoachNhap(list, orders) {
  const ton = new Map();
  for (const o of orders) if (o.from !== "cu") ton.set(normName(o.name), o);
  const cu = {};
  const patch = {};
  let ghep = 0;
  for (const x of list) {
    const o = ton.get(normName(x.n));
    if (!o) { const { id, ...v } = x; cu[id] = v; continue; }
    ghep++;
    if (x.r && !o.rev) patch[`sua/${o.id}/rev`] = x.r;
    if (x.c && !o.note) patch[`sua/${o.id}/note`] = x.c;
    const st = stFromSheet(x.b);
    if (st === "xong" || st === "ban") patch[`sua/${o.id}/st`] = st;
  }
  patch.don_cu = cu;
  return { patch, them: Object.keys(cu).length, ghep };
}
