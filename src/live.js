// ====== DỮ LIỆU THẬT từ Firebase /web/may (lát 2, 05/11) ======
// Mỗi máy Xeon (gói WEB TÓM TẮT, web_tomtat.py) PUT /web/may/m<m> khi có đổi hoặc 10 phút/lần:
//   { v, m, moc, t, cpu?, ram?, kho:{READY..}, g7, k7, tabs:{ t<idx>: { i, s, n?, g?, tg?, k?, tk?, tr?, bd?, td?, san?, t7?, g7?, k7?, e?, kq? } } }
//   s = cay | cho (đủ 100 trận) | dung (tạm dừng) | loi | xong | ngung | san | tao | nhan | tat
// File này đổi dữ liệu đó sang dạng các trang đang dùng (giống data.js mẫu).

// Các máy Xeon đã nối Firebase (29/10). Máy chưa gửi dữ liệu -> hiện xám "chưa gửi dữ liệu".
export const KNOWN = [2, 10, 35, 38, 40, 42, 48, 56, 101, 202];
export const MAT_TIN_HIEU_S = 15 * 60;   // máy gửi ít nhất 10 phút/lần (+2 phút chu kỳ) -> quá 15 phút = mất tín hiệu
export const CPU_CAO = 85;

const num = (v) => (Number.isFinite(+v) ? +v : 0);

export function tuoi(s) {
  if (s < 60) return `${Math.max(0, Math.round(s))} giây`;
  if (s < 3600) return `${Math.round(s / 60)} phút`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ ${Math.round((s % 3600) / 60)} phút`;
  return `${Math.floor(s / 86400)} ngày`;
}

// trạng thái tab của web_tomtat -> khóa trang Máy
const K = { cay: "cay", cho: "cho", dung: "dung", loi: "warn", xong: "xong", ngung: "ngung", san: "san", tao: "tao", nhan: "nhan", tat: "off" };

// Mã thoát của bot (web_tomtat cắt lỗi còn 60 ký tự) -> chữ dễ đọc. 90 = ngủ đêm vì đủ 100 trận: KHÔNG phải lỗi.
const MA = { 92: "Acc bị khóa · bot đã dừng", 96: "Vàng/KC giảm (khách tiêu?) · bot đã dừng" };
const DAY = 86400000;
const bdMs = (bd) => { const t = bd ? new Date(bd.replace(" ", "T")).getTime() : NaN; return Number.isFinite(t) ? t : null; };

function tabOf(x, code, nowMs) {
  let k = K[x.s] || "off", health = x.e || "", nghi = false;
  const ma = /thoát mã (\d+)/.exec(health);
  if (x.s === "loi" && ma && ma[1] === "90") { k = "cho"; health = ""; nghi = true; }
  else if (ma && MA[ma[1]]) health = MA[ma[1]];
  const tr = num(x.tr), g = num(x.g), tg = num(x.tg), td = num(x.td), bd = x.bd || "";
  const b = bdMs(bd);
  const ngay = td > 0 && b != null ? (nowMs - b) / DAY : null;   // gói theo ngày: số ngày đã cày
  return {
    i: num(x.i), k, code, nghi,
    pkg: !!x.n,
    name: x.n || "",
    g, tg, td, ngay,
    kc: num(x.k7), kt: num(x.k), tk: num(x.tk),
    mt: num(x.t7),                       // trận từ 7h
    today: num(x.g7),                    // vàng từ 7h
    tr,                                  // trận cả gói
    gpm: tr > 0 && g > 0 ? g / tr : 0,   // vàng / trận trung bình của gói -> ước dự kiến xong
    bd,
    san: num(x.san),
    kq: x.kq || "",
    health,
  };
}

// % tiến độ: gói theo vàng -> vàng/mục tiêu; gói theo NGÀY (mục tiêu vàng = 0) -> ngày đã cày / số ngày
export const pctOf = (t) => (t.tg > 0 ? Math.min(100, (t.g / t.tg) * 100) : t.td > 0 && t.ngay != null ? Math.max(0, Math.min(100, (t.ngay / t.td) * 100)) : 0);

// raw = giá trị /web/may (object m<m> -> node) hoặc null
export function buildLive(raw, nowMs = Date.now()) {
  const now = nowMs / 1000;
  const nodes = {};
  for (const [key, v] of Object.entries(raw || {})) {
    if (!v || typeof v !== "object") continue;
    const m = Number.isFinite(+v.m) ? +v.m : +String(key).replace(/^m/, "");
    if (Number.isFinite(m)) nodes[m] = v;
  }
  const codes = [...new Set([...KNOWN, ...Object.keys(nodes).map(Number)])].sort((a, b) => a - b);
  const machines = codes.map((m) => {
    const code = "M" + m, v = nodes[m];
    if (!v) return { code, m, s: "none", cay: 0, cho: 0, san: 0, loi: 0, tat: 0, cpu: null, hb: "", why: "Chưa cài gói WEB TÓM TẮT", tabs: [], g7: 0, k7: 0 };
    const tabs = Object.values(v.tabs || {}).filter((x) => x && typeof x === "object").map((x) => tabOf(x, code, nowMs)).sort((a, b) => a.i - b.i);
    const c = (...ks) => tabs.filter((t) => ks.includes(t.k)).length;
    const age = now - num(v.t);
    const cpu = v.cpu == null ? null : num(v.cpu);
    const loi = tabs.filter((t) => t.k === "warn" || (t.health && t.k !== "off"));
    const nLoi = tabs.filter((t) => t.k === "warn").length, nDon = loi.length - nLoi;
    let s = "ok", why = "";
    if (age > MAT_TIN_HIEU_S) { s = "err"; why = `Không có cập nhật ${tuoi(age)} (Agent tắt, máy treo hoặc mất mạng)`; }
    else if (loi.length || (cpu != null && cpu >= CPU_CAO)) {
      s = "warn";
      why = [nLoi ? `${nLoi} tab lỗi` : "", nDon ? `${nDon} tab xong đơn chưa dọn` : "", cpu != null && cpu >= CPU_CAO ? `CPU ${cpu}%` : ""].filter(Boolean).join(" · ");
    }
    return {
      code, m, s, why, cpu, ram: v.ram == null ? null : num(v.ram),
      hb: tuoi(age), age, t: num(v.t),
      cay: c("cay"), cho: c("cho"), dung: c("dung"), san: c("san"), loi: loi.length, tat: c("off"),
      kho: v.kho || {}, g7: num(v.g7), k7: num(v.k7), moc: v.moc || "", tabs, real: true,
    };
  });
  return { machines, real: machines.filter((x) => x.s !== "none"), at: nowMs };
}

// dự kiến xong theo TRẬN (game cho 100 trận/ngày, reset 7h)
export function eta(t) {
  if (!t.tg && t.td > 0) {                                  // gói theo ngày
    if (t.ngay == null) return { ml: null, txt: "Chưa rõ ngày bắt đầu", d: null };
    const con = Math.ceil(t.td - t.ngay);
    return { ml: null, txt: con <= 0 ? "Đủ số ngày" : con === 1 ? "Ngày mai" : `~${con} ngày`, d: Math.max(0, con) };
  }
  if (!t.tg) return { ml: null, txt: "Chưa có mục tiêu", d: null };
  const left = Math.max(0, t.tg - t.g);
  if (t.tg > 0 && left === 0) return { ml: 0, txt: "Đủ mục tiêu", d: 0 };
  if (!t.gpm) return { ml: null, txt: "Chưa đủ số liệu", d: null };
  const ml = Math.ceil(left / t.gpm), rem = Math.max(0, 100 - t.mt);
  if (t.k !== "cho" && ml <= rem) return { ml, txt: "Hôm nay", d: 0 };
  const dd = Math.max(1, Math.ceil((ml - (t.k === "cho" ? 0 : rem)) / 100));
  return { ml, txt: dd === 1 ? "Ngày mai" : `~${dd} ngày`, d: dd };
}

const DANG = ["cay", "cho", "dung"];

// việc cần xử lý cho Tổng quan
export function issuesOf(live) {
  const out = [];
  for (const m of live.real) {
    if (m.s === "err") out.push({ id: m.code + "-hb", sev: "err", src: "Máy", t: `${m.code} mất tín hiệu`, time: m.hb + " trước", p: m.why + `. ${m.cay + m.cho} tab đang cày lúc cập nhật cuối.`, go: m.code });
    if (m.s === "err") continue;
    const loi = m.tabs.filter((t) => t.k === "warn" || (t.health && t.k !== "off"));
    if (loi.length) {
      const p = loi.slice(0, 4).map((t) => `Tab ${t.i}: ${t.health || "lỗi"}`).join(" · ") + (loi.length > 4 ? ` · +${loi.length - 4} tab` : "");
      out.push({ id: m.code + "-tab", sev: "warn", src: "Máy", t: `${m.code} có ${loi.length} tab cần xem`, time: m.hb + " trước", p, go: m.code });
    }
    if (m.cpu != null && m.cpu >= CPU_CAO) out.push({ id: m.code + "-cpu", sev: "warn", src: "Máy", t: `${m.code} CPU ${m.cpu}%`, time: m.hb + " trước", p: "Cao bất thường, giả lập có thể chậm/lag.", go: m.code });
  }
  const R = { err: 0, warn: 1 };
  return out.sort((a, b) => R[a.sev] - R[b.sev]);
}

export function soonOf(live) {
  const out = [];
  for (const m of live.real) for (const t of m.tabs) {
    if (!DANG.includes(t.k) || !t.pkg || (!t.tg && !t.td)) continue;
    const e = eta(t);
    if (e.d === 0 || e.d === 1) out.push({ n: t.name, d: e.d === 0 ? "Hôm nay" : "Ngày mai", p: Math.round(pctOf(t)), go: m.code });
  }
  return out.sort((a, b) => (a.d === b.d ? b.p - a.p : a.d === "Hôm nay" ? -1 : 1)).slice(0, 8);
}

// tab đang cày có vàng từ 7h < 50% trung vị các tab đang cày cùng máy (cần >= 3 tab và trung vị >= 2.000)
export function slowOf(live) {
  const out = [];
  for (const m of live.real) {
    const ts = m.tabs.filter((t) => t.k === "cay" || t.k === "cho");
    if (ts.length < 3) continue;
    const v = ts.map((t) => t.today).sort((a, b) => a - b);
    const med = v[Math.floor(v.length / 2)];
    if (med < 2000) continue;
    for (const t of ts) if (t.today < med * 0.5) out.push({ w: `${m.code} · tab ${t.i}`, n: t.name, today: t.today, note: `${t.mt} trận từ 7h, tab khác ~${med.toLocaleString("vi-VN")}`, ratio: Math.max(0.03, t.today / med), go: m.code });
  }
  return out.sort((a, b) => a.ratio - b.ratio);
}

// gói bắt đầu hôm nay (theo ngày máy tính đang xem)
export function newToday(live, nowMs = Date.now()) {
  const d = new Date(nowMs), p = (n) => String(n).padStart(2, "0");
  const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  let n = 0;
  for (const m of live.real) for (const t of m.tabs) if (t.pkg && t.bd.startsWith(today)) n++;
  return n;
}

const THU = ["Chủ nhật", "thứ Hai", "thứ Ba", "thứ Tư", "thứ Năm", "thứ Sáu", "thứ Bảy"];
export function ngayText(nowMs = Date.now()) {
  const d = new Date(nowMs), h = d.getHours();
  const buoi = h < 11 ? "Sáng" : h < 14 ? "Trưa" : h < 18 ? "Chiều" : "Tối";
  return `${buoi} ${d.getDay() === 0 ? "chủ nhật" : THU[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}
