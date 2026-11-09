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
  const out = { may: may || {}, nha: nha || null, at: Date.now(), kt: {} };
  const h = (nha && nha.h) || {};
  // máy nhà
  const jobs = [];
  // (lát 4) gói ĐÃ KẾT THÚC 7 ngày của từng Xeon (web_tomtat 05/11c): chỉ đọc lại /web/kt/m<m> khi mã băm 'kh' trong /web/may đổi
  for (const [key, v] of Object.entries(out.may)) {
    if (!v || typeof v !== "object" || !v.kh) continue;
    const m = Number.isFinite(+v.m) ? +v.m : +String(key).replace(/^m/, "");
    if (!Number.isFinite(m)) continue;
    jobs.push(byHash("kt/m" + m, "kt/m" + m, v.kh).then((d) => { out.kt[m] = (d && d.l) || {}; }, () => { const c = cached("kt/m" + m); out.kt[m] = (c && c.l) || {}; }));
  }
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
  if (/^(GL\.|KICK|GIFT)/.test(n)) return "Tay";                 // đơn tay / đơn lạ
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

// gói đã kết thúc (web_tomtat 05/11c, /web/kt) -> trạng thái đơn
export const KT_ST = { xong: "xong", khoa: "ban", kick: "dung", cancel: "dung", dung: "dung", dong: null };
export const KT_NGAN = { xong: "xong", khoa: "khóa acc", kick: "KICK", cancel: "CANCEL", dung: "dừng", dong: "đóng tay" };
export const KT_TEXT = { xong: "xong gói", khoa: "acc bị khóa", kick: "khách kick máy", cancel: "khách tiêu vàng/KC (CANCEL)", dung: "đã dừng", dong: "đóng gói tay" };
// data.kt = { m: { p<id>: {n, c, t, i, g, tg, ...} } } -> Map(tên chuẩn -> gói kết thúc MỚI NHẤT cùng tên)
export function endedByName(data) {
  const map = new Map();
  for (const [m, l] of Object.entries((data && data.kt) || {})) for (const x of Object.values(l || {})) {
    if (!x || typeof x !== "object" || !x.n || !x.t) continue;
    const k = normName(x.n), old = map.get(k);
    if (!old || String(x.t) > String(old.t)) map.set(k, { ...x, m: "M" + m });
  }
  return map;
}
const ktDay = (t) => String(t || "").slice(0, 10);

// data = kết quả loadAll; live = buildLive(may) -> danh sách đơn thống nhất
export function buildOrders(data, live) {
  const sua = (data && data.web && data.web.sua) || {};
  const byName = new Map();
  for (const m of (live && live.real) || []) for (const t of m.tabs) if (t.pkg && t.name) byName.set(normName(t.name), { t, m });
  const ended = endedByName(data);
  const out = [];
  const seen = new Set();
  // đơn cũ (Sheet) đã nhập kiểu mới (có thứ tự dòng 'i') -> so được đơn tự động nào KHÔNG có trong Sheet
  const cuAll = Object.values((data && data.web && data.web.don_cu) || {}).filter((x) => x && typeof x === "object" && x.d);
  const soSheet = cuAll.some((x) => x.i != null);
  const tenSheet = new Set(cuAll.map((x) => normName(x.n)));
  const ngayCuoiSheet = cuAll.reduce((a, x) => (x.d > a ? x.d : a), "");
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
    } else if (ended.has(normName(o.name)) && ktDay(ended.get(normName(o.name)).t) >= (o.day || "")) {
      // tab đã xóa + clone (hoặc bỏ khỏi web), máy vẫn nhớ gói này kết thúc trong 7 ngày -> tự đổi tình trạng (sửa tay vẫn thắng)
      const e = ended.get(normName(o.name));
      o.ended = { c: e.c, t: e.t, m: e.m, r: e.r || "" };
      o.g = e.g ?? o.g; o.tg = e.tg || o.tg;
      if (!o.m) o.m = e.m;
      if (o.tab === "—" || o.tab == null) o.tab = e.i ?? o.tab;
      o.autoSt = KT_ST[e.c] ?? (o.kq && o.kq.st) ?? null;
    } else if (o.kq) { o.g = o.kq.g ?? o.g; o.tg = o.kq.tg || o.tg; o.autoSt = o.kq.st || null; }
    o.xoa = !!s.xoa || s.st === "bo";
    o.stBo = s.st === "bo";                             // đã xóa (đơn test...) -> ẩn, không tính tiền; "bo" = bản cũ của nút này
    o.han = s.han || "";                                          // ngày đến hạn chọn tay (đơn 0đ: khách gửi lại / tặng)
    o.san = Math.max(0, Math.min(60, Math.round(+s.san || 0)));   // (06/11) cộng thêm ngày nâng sân (đơn chưa full sân "60-7K")
    o.st = (s.st && s.st !== "bo" ? s.st : null) || o.autoSt || o.st || "cay";
    o.kenh = kenhOf(o.name, o.src);
    out.push(o);
  };
  // 1) đơn tự động từ máy nhà
  for (const [day, os] of Object.entries((data && data.don) || {})) for (const [id, x] of Object.entries(os || {})) {
    if (!x || typeof x !== "object") continue;
    if (x.s === "loi") continue;                                  // đơn lỗi cần kiểm tay: không đưa vào danh sách (đã có ở Số TREO / Cảnh báo)
    seen.add(normName(x.n));
    const st0 = x.s === "noi" ? "noi" : x.s === "loi" ? "kiem" : null;
    finish({ id, from: "auto", ngoaiSheet: soSheet && day <= ngayCuoiSheet && x.s === "ok" && !tenSheet.has(normName(x.n)), name: x.n || "", src: SRC[x.src] || "Khách VN", m: x.m != null ? "M" + x.m : "", tab: x.tab ?? "—", day, start: dmy(day),
      g: 0, tg: 0, st: st0 || "cay", ly: x.ly || "", t: x.t, fixed: !!st0 });
  }
  // 2) đơn tay nhập trên web
  for (const [id, x] of Object.entries((data && data.web && data.web.don_tay) || {})) {
    if (!x || typeof x !== "object" || !x.day) continue;
    seen.add(normName(x.n));
    finish({ id, from: "tay", auto: !!x.auto, name: x.n || "", src: x.auto || x.loai === "khac" ? srcFromName(x.n) : "Tay", m: x.m || mayFromName(x.n), tab: x.tab ?? "—", day: x.day, start: dmy(x.day), g: 0, tg: 0, st: "cay", note: x.note || "", t: x.t });
  }
  // 3) đơn cũ nhập 1 lần từ Sheet (bỏ đơn đã có ở 1/2 cùng tên)
  for (const [id, x] of Object.entries((data && data.web && data.web.don_cu) || {})) {
    if (!x || typeof x !== "object" || !x.d) continue;
    if (seen.has(normName(x.n))) continue;
    seen.add(normName(x.n));
    finish({ id, from: "cu", name: x.n || "", src: srcFromName(x.n), m: mayFromName(x.n), tab: "—", day: x.d, start: dmy(x.d), g: 0, tg: 0,
      st: stFromSheet(x.b), rev: x.r || "", note: x.c || "", i: x.i });
  }
  // 4) (06/11) gói NGL/IML ĐANG CHẠY trên máy mà không có đơn nào cùng tên (code nhận qua Messenger, tạo gói tay trên Xeon)
  //    -> hiện luôn + main.jsx tự lưu 1 lần vào /web/don_tay (auto: 1) để nhớ cả khi tab đã xóa + clone.
  for (const [k, { t, m }] of byName) {
    if (seen.has(k) || !TU_THEM.test(String(t.name).trim())) continue;
    seen.add(k);
    const day = /^\d{4}-\d{2}-\d{2}/.test(t.bd || "") ? t.bd.slice(0, 10) : ymd(Date.now());
    finish({ id: idMay(t.name), from: "may", auto: true, name: t.name, src: srcFromName(t.name), m: m.code, tab: t.i, day, start: dmy(day), g: 0, tg: 0, st: "cay" });
  }
  return out.sort((a, b) => (a.day === b.day ? cmpTrongNgay(a, b) : a.day < b.day ? -1 : 1));
}
const TU_THEM = /^(?:GL\.|KICK\.?)?(?:NGL|IML)\d+/i;
// id cố định theo tên gói (FNV-1a) -> sửa giá/ghi chú trước và sau khi lưu vào don_tay vẫn cùng 1 id
export function idMay(name) {
  let h = 0x811c9dc5;
  for (const ch of normName(name)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return "a" + h.toString(36);
}
// đơn tự thêm từ máy chưa lưu -> patch /web/don_tay/<id>
export function mayCanGhi(orders) {
  const patch = {};
  for (const o of orders) if (o.from === "may") patch[`don_tay/${o.id}`] = { n: o.name.slice(0, 100), day: o.day, m: o.m, tab: o.tab, t: Math.floor(Date.now() / 1000), auto: 1, note: "" };
  return patch;
}

// Thứ tự trong 1 ngày giống Google Sheet: Khách VN -> NGL (theo số) -> IML (theo số) -> đơn tay / đơn lạ (GL.NGL, GL.IML, còn lại)
const SO = /^(?:GL\.|KICK\.?)?(NGL|IML)(\d+)/i;
function hang(o) {
  const n = String(o.name || "").trim();
  const m = SO.exec(n), tay = o.src === "Tay" || /^(GL|KICK|GIFT)\b/i.test(n);
  if (tay) return [3, m ? (m[1].toUpperCase() === "NGL" ? 0 : 1) : 2, m ? +m[2] : 0];
  if (o.src === "NGL" || o.src === "IML") return [o.src === "NGL" ? 1 : 2, 0, m ? +m[2] : 1e9];
  return [0, 0, 0];
}
export function cmpTrongNgay(a, b) {
  const x = hang(a), y = hang(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return (a.i ?? 1e9) - (b.i ?? 1e9) || (a.t || 0) - (b.t || 0) || a.name.localeCompare(b.name);
}

// Trạng thái đơn tự động thấy trên máy -> lưu lại (để khi tab đã xóa+clone, web vẫn nhớ đơn xong/đang ở đâu).
// Chỉ ghi khi đổi loại trạng thái hoặc tiến độ qua mốc 25% -> rất ít lần ghi.
export function kqCanGhi(orders) {
  const patch = {};
  for (const o of orders) {
    if (!o.autoSt || !(o.live ? o.from !== "cu" : o.ended)) continue;            // thấy trên máy (đơn không phải Sheet) hoặc máy báo đã kết thúc
    if (o.from === "cu" && o.ended && o.autoSt === "cay") continue;
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
  if (treo.length) out.push({ id: "so-treo", sev: "warn", src: "Tổng đài", t: `${treo.length} số đang TREO`, p: treo.slice(0, 4).map((x) => `${x.s}: ${x.ly}`).join(" · ") + (treo.length > 4 ? ` · +${treo.length - 4}` : "") + ". Kiểm tay rồi bấm Đã dùng / Trả về quỹ ở khung Số thứ tự đơn (Tổng quan)." });
  return out;
}

// cảnh báo #canh-bao -> danh sách (mới nhất trên)
// (09/11) cảnh báo đã đọc: /web/cfg/doc/<khóa> = giờ đọc (giây). Khóa theo id + nội dung -> nội dung đổi thì hiện lại là chưa đọc.
export function docKey(a) {
  let h = 0x811c9dc5;
  for (const ch of `${a.id}|${a.t || ""}|${a.p || ""}`) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return "d" + h.toString(36);
}
export const daDoc = (data, a) => !!(data && data.web && data.web.cfg && data.web.cfg.doc && data.web.cfg.doc[docKey(a)]);
// patch đánh dấu đã đọc + xóa khóa cũ hơn 7 ngày
export function docPatch(data, list) {
  const now = Math.floor(Date.now() / 1000);
  const p = {};
  for (const a of list) p[`cfg/doc/${docKey(a)}`] = now;
  const cu = (data && data.web && data.web.cfg && data.web.cfg.doc) || {};
  for (const [k, t] of Object.entries(cu)) if (!(`cfg/doc/${k}` in p) && now - (+t || 0) > 7 * 86400) p[`cfg/doc/${k}`] = null;
  return p;
}
export function tdAlerts(data) {
  return Object.entries((data && data.cb) || {}).map(([id, a]) => {
    const x = String(a.x || "");
    const first = x.split(/(?<=[.!?])\s|\n/)[0];
    return { id, sev: sevOfText(x), src: "Tổng đài", t: first.length > 90 ? first.slice(0, 88) + "…" : first, p: x.length > first.length ? x : "", ts: (a.t || 0) * 1000 };
  }).sort((a, b) => b.ts - a.ts);
}
