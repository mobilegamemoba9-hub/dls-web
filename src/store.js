// ====== DỮ LIỆU THẬT LÁT 3 (05/11): máy nhà (Tổng đài) + chỗ Trọng sửa trên web ======
// Máy nhà (web_tongdai.py) ghi: /web/nha (mỗi lần đổi hoặc 10 phút), /web/so, /web/canh_bao, /web/don_idx, /web/don/<YYYY-MM-DD>/o<oid>
// Web ghi (khi Trọng sửa): /web/sua/<id> {rev, note, st, kq}, /web/gia [..], /web/cfg {rate}, /web/don_tay/<id>, /web/don_cu/<id>,
//   /web/cong_no/<ngl|iml> {tu, ls}, /web/ver/<nhánh> = giờ sửa cuối.
// TIẾT KIỆM LƯỢT TẢI: mỗi lần làm mới chỉ đọc /web/may + /web/nha + /web/ver (vài KB). Nhánh khác chỉ đọc lại khi mã băm/giờ sửa ĐỔI;
// bản đã đọc lưu trong trình duyệt (localStorage) nên mở lại trang không phải tải lại 2.000 đơn cũ.
import { readWeb, writeWeb } from "./firebase.js";

const LS = "web3:";
const lsGet = (k) => { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : null; } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch { /* đầy / bị chặn: bỏ qua, lần sau đọc lại */ } };

// mem: bản trong bộ nhớ (sống suốt phiên mở trang)
const mem = { h: {}, v: {}, d: {} };
function cached(k) {
  if (!(k in mem.d)) { const c = lsGet(k); if (c) { mem.d[k] = c.d; mem.h[k] = c.h; } }
  return mem.d[k];
}
function keep(k, h, d) { mem.d[k] = d; mem.h[k] = h; lsSet(k, { h, d }); }

// Đọc nhánh k nếu mã đổi (h) -> dữ liệu. Lỗi đọc -> giữ bản cũ.
async function byHash(k, path, h) {
  const old = cached(k);
  if (h != null && mem.h[k] === h && old !== undefined) return old;
  const d = await readWeb(path);
  keep(k, h, d);
  return d;
}

const WEB_NHANH = ["sua", "gia", "cfg", "don_tay", "don_cu", "cong_no"];

// -> { may, nha, so, cb, don: {ngày: {o..}}, web: {sua, gia, cfg, don_tay, don_cu, cong_no}, at }
export async function loadAll() {
  const [may, nha, ver] = await Promise.all([readWeb("may"), readWeb("nha"), readWeb("ver")]);
  const out = { may: may || {}, nha: nha || null, at: Date.now() };
  const h = (nha && nha.h) || {};
  // máy nhà
  const jobs = [];
  if (nha) {
    jobs.push(byHash("so", "so", h.so).then((v) => (out.so = v)));
    jobs.push(byHash("cb", "canh_bao", h.cb).then((v) => (out.cb = v || {})));
    jobs.push((async () => {
      const idx = (await byHash("don_idx", "don_idx", h.don)) || {};
      const don = {};
      await Promise.all(Object.entries(idx).map(async ([d, x]) => { don[d] = (await byHash("don/" + d, "don/" + d, x && x.h)) || {}; }));
      out.don = don;
    })());
  } else { out.so = null; out.cb = {}; out.don = {}; }
  // chỗ Trọng sửa
  out.web = {};
  for (const k of WEB_NHANH) jobs.push(byHash("w:" + k, k, (ver && ver[k]) ?? 0).then((v) => (out.web[k] = v)));
  await Promise.all(jobs);
  return out;
}

// Bản chỗ-Trọng-sửa đang có trong máy này (sau khi save, khỏi đọc lại Firebase)
export function localWeb() { const o = {}; for (const k of WEB_NHANH) o[k] = cached("w:" + k) ?? null; return o; }

// Ghi chỗ Trọng sửa + đánh dấu giờ sửa để máy/điện thoại khác đọc lại. patch: { "sua/o12/rev": "1.5$" }
export async function save(patch) {
  const now = Date.now();
  const p = { ...patch };
  const nhanh = new Set(Object.keys(patch).map((k) => k.split("/")[0]));
  for (const k of nhanh) p[`ver/${k}`] = now;
  await writeWeb(p);
  // cập nhật bản trong máy này luôn (khỏi đọc lại chính thứ mình vừa ghi)
  for (const k of nhanh) {
    let d = structuredClone(cached("w:" + k) ?? null);
    for (const [path, v] of Object.entries(patch)) {
      const ks = path.split("/"); if (ks[0] !== k) continue;
      if (ks.length === 1) { d = v; continue; }
      if (d == null || typeof d !== "object") d = {};
      let o = d;
      for (const x of ks.slice(1, -1)) o = o[x] = o[x] && typeof o[x] === "object" ? o[x] : {};
      if (v === null) delete o[ks.at(-1)]; else o[ks.at(-1)] = v;
    }
    keep("w:" + k, now, d);
  }
}

// ---------------------------------------------------------------- đổi sang đơn cho trang Đơn / Doanh thu
const pad = (n) => String(n).padStart(2, "0");
export const ymd = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const dmy = (day) => { const [y, m, d] = day.split("-"); return `${d}/${m}/${y}`; };
export const normName = (s) => String(s || "").toLowerCase().replace(/\s+/g, "");
// "kênh tiền" của đơn: NGL (đô), IML, Khách VN. Đơn tay GL.NGL… -> NGL, GL.IML… -> IML, còn lại -> Khách VN
export function kenhOf(name, src) {
  if (src === "NGL" || src === "IML" || src === "Khách VN") return src;
  const n = String(name || "").replace(/^(GL\.|KICK\.?)/i, "").toUpperCase();
  return n.startsWith("NGL") ? "NGL" : n.startsWith("IML") ? "IML" : "Khách VN";
}
export function srcFromName(name) {
  const n = String(name || "").trim().toUpperCase();
  if (/^(GL\.|KICK)/.test(n)) return "Tay";
  return n.startsWith("NGL") ? "NGL" : n.startsWith("IML") ? "IML" : "Khách VN";
}

const mayFromName = (name) => { const m = /\bM(\d+)\s*$/i.exec(String(name || "")); return m ? "M" + m[1] : ""; };
const SRC = { NGL: "NGL", IML: "IML", VN: "Khách VN" };
// trạng thái Sheet cột B -> st
export function stFromSheet(b) {
  const s = String(b || "").toLowerCase();
  if (s.includes("xong") || s === "done") return "xong";
  if (s.includes("khóa") || s.includes("khoá") || s.includes("ban")) return "ban";
  if (s.includes("dừng") || s.includes("hủy") || s.includes("huỷ") || s.includes("cancel") || s.includes("kick")) return "dung";
  return "cay";
}
// trạng thái tab trên máy (live.js) -> st của đơn
function stFromTab(t) {
  if (["cay", "cho", "dung"].includes(t.k)) return "cay";
  if (t.k === "xong") return "xong";
  if (t.k === "ngung" || (t.k === "warn" && /khóa/i.test(t.health))) return /khóa/i.test(t.health) ? "ban" : "dung";
  return null;
}

// data = kết quả loadAll; live = buildLive(may) -> danh sách đơn thống nhất
export function buildOrders(data, live) {
  const sua = (data && data.web && data.web.sua) || {};
  const byName = new Map();
  for (const m of (live && live.real) || []) for (const t of m.tabs) if (t.pkg && t.name) byName.set(normName(t.name), { t, m });
  const out = [];
  const seen = new Set();
  const finish = (o) => {
    const s = sua[o.id] || {};
    const hit = byName.get(normName(o.name));
    o.rev = s.rev ?? o.rev ?? "";
    o.note = s.note ?? o.note ?? "";
    o.kq = s.kq || null;
    if (hit) {
      const { t, m } = hit;
      o.live = { k: t.k, g: t.g, tg: t.tg, td: t.td, ngay: t.ngay, health: t.health };
      o.g = t.g; o.tg = t.tg || o.tg; o.m = m.code; o.tab = t.i;
      o.autoSt = stFromTab(t);
    } else if (o.kq) { o.g = o.kq.g ?? o.g; o.tg = o.kq.tg || o.tg; o.autoSt = o.kq.st || null; }
    o.st = s.st || o.autoSt || o.st || "cay";
    o.kenh = kenhOf(o.name, o.src);
    out.push(o);
  };
  // 1) đơn tự động từ máy nhà
  for (const [day, os] of Object.entries((data && data.don) || {})) for (const [id, x] of Object.entries(os || {})) {
    if (!x || typeof x !== "object") continue;
    seen.add(normName(x.n));
    const st0 = x.s === "noi" ? "noi" : x.s === "loi" ? "kiem" : null;
    finish({ id, from: "auto", name: x.n || "", src: SRC[x.src] || "Khách VN", m: x.m != null ? "M" + x.m : "", tab: x.tab ?? "—", day, start: dmy(day),
      g: 0, tg: 0, st: st0 || "cay", ly: x.ly || "", t: x.t, fixed: !!st0 });
  }
  // 2) đơn tay nhập trên web
  for (const [id, x] of Object.entries((data && data.web && data.web.don_tay) || {})) {
    if (!x || typeof x !== "object" || !x.day) continue;
    seen.add(normName(x.n));
    finish({ id, from: "tay", name: x.n || "", src: "Tay", m: x.m || mayFromName(x.n), tab: x.tab ?? "—", day: x.day, start: dmy(x.day), g: 0, tg: 0, st: "cay", note: x.note || "", t: x.t });
  }
  // 3) đơn cũ nhập 1 lần từ Sheet (bỏ đơn đã có ở 1/2 cùng tên)
  for (const [id, x] of Object.entries((data && data.web && data.web.don_cu) || {})) {
    if (!x || typeof x !== "object" || !x.d) continue;
    if (seen.has(normName(x.n))) continue;
    finish({ id, from: "cu", name: x.n || "", src: srcFromName(x.n), m: mayFromName(x.n), tab: "—", day: x.d, start: dmy(x.d), g: 0, tg: 0,
      st: stFromSheet(x.b), rev: x.r || "", note: x.c || "" });
  }
  return out.sort((a, b) => (a.day === b.day ? (a.t || 0) - (b.t || 0) || a.name.localeCompare(b.name) : a.day < b.day ? -1 : 1));
}

// Trạng thái đơn tự động thấy trên máy -> lưu lại (để khi tab đã xóa+clone, web vẫn nhớ đơn xong/đang ở đâu).
// Chỉ ghi khi đổi loại trạng thái hoặc tiến độ qua mốc 25% -> rất ít lần ghi.
export function kqCanGhi(orders) {
  const patch = {};
  for (const o of orders) {
    if (!o.live || !o.autoSt || o.from === "cu") continue;
    const p = o.tg > 0 ? Math.min(100, Math.floor((o.g / o.tg) * 4) * 25) : -1;      // -1 = gói theo ngày / chưa có mục tiêu
    const old = o.kq || {};
    if (old.st !== o.autoSt || (old.p ?? -1) !== p) patch[`sua/${o.id}/kq`] = { st: o.autoSt, p, g: o.g || 0, tg: o.tg || 0, t: Date.now() };
  }
  return patch;
}

// ---------------------------------------------------------------- tiền
export const isUsdV = (v) => /\$$/.test(String(v || ""));
export function money(v) {
  if (!v) return { usd: 0, vnd: 0 };
  if (isUsdV(v)) return { usd: parseFloat(String(v).replace(",", ".")) || 0, vnd: 0 };
  return { usd: 0, vnd: parseInt(String(v).replace(/\D/g, ""), 10) || 0 };
}

// ---------------------------------------------------------------- cảnh báo Tổng đài + máy nhà
export function sevOfText(x) {
  if (/NGUY CƠ TRÙNG|MẤT tín hiệu|HỎNG|mất tín hiệu khi đang chạy/i.test(x)) return "err";
  if (/^\s*(✅|ℹ️|↩️)/.test(x)) return "info";
  return "warn";
}
const NHA_MAT_S = 15 * 60;
export function homeIssues(data, nowMs = Date.now()) {
  const out = [];
  const n = data && data.nha;
  if (!n) return out;
  const age = nowMs / 1000 - (n.t || 0);
  if (age > NHA_MAT_S) out.push({ id: "nha-mat", sev: "err", src: "Tổng đài", t: "Máy nhà mất tín hiệu", p: `Tổng đài không gửi gì ${Math.round(age / 60)} phút (máy nhà tắt, mất mạng, hoặc cửa sổ TONG_DAI đã đóng). Đối tác gửi code sẽ không ai nhận.` });
  else {
    if (n.tre) out.push({ id: "nha-tre", sev: "err", src: "Tổng đài", t: "Tổng đài bị đứng", p: "Vòng xử lý của Tổng đài đứng quá 3 phút. Xem cửa sổ TONG_DAI trên máy nhà." });
    if (n.dc === "loi") out.push({ id: "nha-dc", sev: "warn", src: "Tổng đài", t: "Bot Discord đọc lỗi", p: n.dc_e || "Không đọc được kênh code." });
    if (n.fb === 0) out.push({ id: "nha-fb", sev: "warn", src: "Tổng đài", t: "Máy nhà mất kết nối Firebase", p: "Không gán được đơn cho máy Xeon cho tới khi có lại kết nối." });
    if (n.cho > 0) out.push({ id: "nha-cho", sev: "warn", src: "Tổng đài", t: `${n.cho} code đang chờ gán`, p: "Chưa có tab sẵn sàng ở máy Xeon nào. Code sống khoảng 4 phút." });
  }
  const treo = (data.so && data.so.treo) || [];
  if (treo.length) out.push({ id: "so-treo", sev: "warn", src: "Tổng đài", t: `${treo.length} số đang TREO`, p: treo.slice(0, 4).map((x) => `${x.s}: ${x.ly}`).join(" · ") + (treo.length > 4 ? ` · +${treo.length - 4}` : "") + ". Kiểm tay rồi dùng dat_so.py dung/tra." });
  return out;
}

// cảnh báo #canh-bao -> danh sách (mới nhất trên)
export function tdAlerts(data) {
  return Object.entries((data && data.cb) || {}).map(([id, a]) => {
    const x = String(a.x || "");
    const first = x.split(/(?<=[.!?])\s|\n/)[0];
    return { id, sev: sevOfText(x), src: "Tổng đài", t: first.length > 90 ? first.slice(0, 88) + "…" : first, p: x.length > first.length ? x : "", ts: (a.t || 0) * 1000 };
  }).sort((a, b) => b.ts - a.ts);
}
