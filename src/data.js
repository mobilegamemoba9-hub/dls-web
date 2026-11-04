// ====== DỮ LIỆU MẪU (lấy từ bản demo Tabler 04/11) ======

const mk = (code, s, cay, cho, san, loi, tat, cpu, hb, why) => ({ code, s, cay, cho, san, loi, tat, cpu, hb, why });
export const machines = [
  mk("M10", "warn", 6, 2, 2, 3, 5, 58, "8 giây", "Tab 11 hỏng ADB, tool đang tự sửa"),
  mk("M101", "ok", 11, 2, 2, 0, 1, 64, "5 giây", ""),
  mk("M202", "ok", 10, 2, 2, 0, 2, 57, "7 giây", ""),
  mk("M35", "ok", 9, 2, 3, 0, 2, 52, "9 giây", ""),
  mk("M38", "warn", 8, 2, 1, 2, 3, 91, "7 giây", "2 đơn quá hạn, số NGL233 đang treo"),
  mk("M40", "warn", 7, 2, 1, 5, 1, 49, "10 giây", "5 tab xong đơn chưa dọn"),
  mk("M42", "err", 10, 2, 0, 0, 4, null, "14 phút", "Mất nhịp tim 14 phút, kiểm máy hoặc StarDesk"),
  mk("M48", "ok", 9, 2, 3, 1, 1, 59, "6 giây", ""),
  mk("M56", "ok", 8, 2, 2, 0, 4, 47, "8 giây", ""),
  mk("M2", "ok", 12, 2, 1, 0, 1, 66, "5 giây", ""),
].sort((a, b) => +a.code.slice(1) - +b.code.slice(1));

// sev: err | warn | info ; src: Máy | Tổng đài
export const alerts = [
  { id: 1, sev: "err", src: "Máy", t: "M42 mất tín hiệu", day: "Hôm nay", time: "20:30", p: "Không có nhịp tim 14 phút. 12 tab đang cày trên máy này chưa rõ tình trạng.", go: "M42", act: "Kiểm StarDesk" },
  { id: 2, sev: "warn", src: "Máy", t: "M10 tab 11 hỏng ADB", day: "Hôm nay", time: "20:39", p: "Tool đang tự sửa, bước 2 trên 3.", go: "M10" },
  { id: 3, sev: "warn", src: "Máy", t: "M38 CPU 91%", day: "Hôm nay", time: "20:12", p: "Cao bất thường so với mức thường 55–65%. 2 đơn trên máy này đã quá hạn.", go: "M38" },
  { id: 4, sev: "warn", src: "Tổng đài", t: "Số NGL233 đang treo", day: "Hôm nay", time: "02:14", p: "Đơn trên M38 tab 7 lỗi NO_LINK_BUTTON. Kiểm acc rồi chọn dùng hoặc trả số.", go: "" },
  { id: 5, sev: "warn", src: "Máy", t: "M40 có 5 tab chưa dọn", day: "Hôm qua", time: "23:05", p: "Tab 4, 6, 10, 11, 12 xong đơn nhưng còn acc cũ.", go: "M40" },
  { id: 6, sev: "info", src: "Tổng đài", t: "Bot Discord kết nối lại", day: "Hôm qua", time: "18:47", p: "Mất kết nối 2 phút rồi tự vào lại, không mất code nào.", go: "" },
];

export const soon = [
  { n: "NGL226.30+5K.19/10(0015) M101", d: "Hôm nay", p: 96 },
  { n: "iml6.150k.13/10(1968) m40", d: "Hôm nay", p: 98 },
  { n: "duyle.70K.19/10(1217) M38", d: "Ngày mai", p: 91 },
  { n: "NGL229.60K.19/10(3454) M38", d: "Ngày mai", p: 88 },
  { n: "mkhoa.190+102K.19/10(1948) M101", d: "Ngày mai", p: 90 },
];

export const slow = [
  { w: "M48 · tab 9", n: "NGL227.570+36K", today: 3900, note: "máy này thường ~8.000", ratio: 0.49 },
  { w: "M35 · tab 3", n: "iml3.30-15k", today: 1300, note: "mới 12 trận từ 7h, tab khác đã 46", ratio: 0.26 },
];
// ---- tab từng máy (sinh cố định theo mã máy) ----
const PK = ["NGL226.30+5K.19/10(0015)", "mkhoa.190+102K.19/10(1948)", "iml6.150k.13/10(1968)", "duyle.70K.19/10(1217)", "NGL229.60K.19/10(3454)", "NGL225.350-17K.19/10(2505)"];
const cellsOf = (m) => [...Array(m.cay).fill("cay"), ...Array(m.cho).fill("cho"), ...Array(m.san).fill("san"), ...Array(m.loi).fill("warn"), ...Array(m.tat).fill("off")];
export function tabsOf(code) {
  let s = [...code].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483647;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const m = machines.find((x) => x.code === code);
  return cellsOf(m).map((k, i) => {
    const tg = [30000, 60000, 70000, 150000, 190000][Math.floor(r() * 5)];
    const has = k !== "san" && k !== "off";
    const g = has ? Math.round((tg * r() * 0.95) / 100) * 100 : 0;
    return {
      i: i + 1, k,
      name: has ? PK[Math.floor(r() * PK.length)] + " " + code : k === "san" ? "NEW" + (i + 1) : "",
      g, tg,
      mt: k === "cho" ? 100 : has ? Math.floor(r() * 96) : 0,
      gpm: has ? Math.round(60 + r() * 80) : 0,
      kpm: has ? +(2 + r() * 3).toFixed(1) : 0,
      health: k === "warn" ? (r() < 0.5 ? "ADB hỏng, đang tự sửa" : "Xong đơn, chưa dọn tab") : "",
    };
  }).map((t) => ({ ...t, today: Math.round(t.mt * t.gpm), kc: Math.round(t.mt * t.kpm) }));
}

// ---- số ngày cày theo giá: Y HỆT công thức cột NGÀY ĐẾN HẠN của Sheet BACKUP 2026 (đọc 05/11) ----
// Đến hạn = Ngày thuê + số ngày của giá ở cột Doanh thu. Giá không có trong bảng (0đ, 15.000đ, 400.000đ, 600.000đ, 1.000.000đ)
// -> để trống hạn (Trọng chốt 05/11; Sheet đang tính +0). Chưa chọn giá -> để trống. Sửa được ở Doanh thu -> Danh sách giá.
export const HAN = {
  "50.000đ": 4, "100.000đ": 9, "150.000đ": 14, "200.000đ": 18, "250.000đ": 24, "300.000đ": 28, "350.000đ": 34, "500.000đ": 50, "800.000đ": 82,
  "1.5$": 4, "2.7$": 7, "3.1$": 8, "4.7$": 13, "6.3$": 17, "6.7$": 17, "9.5$": 25, "15.9$": 44, "23.8$": 70,
};
const DAY = 86400000;
const pad = (n) => String(n).padStart(2, "0");
export const ddmm = (t) => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const homNay = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
export const todayDDMM = () => ddmm(Date.now());
// "13/10" hoặc "13/10/2026" -> mốc 0h ngày đó (năm thiếu: năm nay; nếu rơi xa hơn 2 tháng về tương lai thì năm trước)
export function parseNgay(s) {
  const m = String(s || "").match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (!m) return null;
  const now = new Date();
  let y = m[3] ? +m[3] : now.getFullYear();
  let t = new Date(y, +m[2] - 1, +m[1]).getTime();
  if (!m[3] && t - homNay() > 60 * DAY) t = new Date(y - 1, +m[2] - 1, +m[1]).getTime();
  return t;
}
// -> { due: "dd/mm" | "—", left: chữ, ls: ok|late|done|ban|none, dueT }
export function tinhHan(o, prices, today = homNay()) {
  const p = prices.find((x) => x.v === o.rev);
  const days = p ? p.d : null;
  const t0 = parseNgay(o.start);
  const dueT = o.rev && t0 != null && Number.isFinite(days) && days != null ? t0 + days * DAY : null;
  const due = dueT == null ? "—" : ddmm(dueT);
  if (o.st === "xong") return { due, dueT, left: "Xong", ls: "done" };
  if (o.st === "ban") return { due, dueT, left: "Acc bị khóa", ls: "ban" };
  if (dueT == null) return { due, dueT, left: o.rev ? "—" : "Chưa có giá", ls: "none" };
  const n = Math.round((dueT - today) / DAY);
  return { due, dueT, left: n < 0 ? `Trễ ${-n} ngày` : n === 0 ? "Hôm nay" : `${n} ngày`, ls: n < 0 ? "late" : "ok" };
}

// ---- giá chọn nhanh (màu như Sheet) ----
const COL = { gray: ["#E9ECF0", "#3F4A5A"], slate: ["#C9DCE3", "#24414D"], blue: ["#BFE0F8", "#0B4A7A"], green: ["#CDEFC9", "#1F5A1B"], yellow: ["#FFE7A3", "#5C4300"], orange: ["#FFCDB0", "#6A2E0B"], purple: ["#5B2D86", "#FFFFFF"] };
export const initialPrices = [
  ["0đ", "gray"], ["15.000đ", "gray"], ["50.000đ", "slate"], ["100.000đ", "blue"], ["150.000đ", "blue"], ["200.000đ", "green"], ["250.000đ", "green"], ["300.000đ", "yellow"], ["350.000đ", "yellow"], ["400.000đ", "orange"], ["500.000đ", "orange"], ["600.000đ", "orange"], ["800.000đ", "purple"], ["1.000.000đ", "purple"],
  ["1.5$", "slate"], ["2.7$", "blue"], ["3.1$", "blue"], ["4.7$", "blue"], ["6.3$", "green"], ["6.7$", "green"], ["9.5$", "yellow"], ["15.9$", "orange"], ["23.8$", "purple"],
].map(([v, c], id) => ({ id, v, bg: COL[c][0], fg: COL[c][1], d: HAN[v] ?? null }));
export const isUsd = (v) => /\$$/.test(v);
export const inkOn = (h) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150 ? "#1F2937" : "#FFFFFF"; };

// ---- đơn ---- (NGL tính đô; IML + khách VN tính tiền Việt; đơn tay tự chọn)
const o = (name, src, m, tab, g, tg, start, due, left, ls, note, rev, st) => ({ id: name, name, src, m, tab, g, tg, start, due, left, ls, note, rev, st });
export const initialOrders = [
  o("iml3.30-15k.13/10(1114) m101", "IML", "M101", 6, 12300, 15000, "13/10", "17/10", "Trễ 4 ngày", "late", "", "50.000đ", "cay"),
  o("iml6.150k.13/10(1968) m40", "IML", "M40", 3, 98200, 150000, "13/10", "31/10", "10 ngày", "ok", "", "200.000đ", "cay"),
  o("iml7.70k.13/10(8687) m48", "IML", "M48", 2, 70000, 70000, "13/10", "22/10", "Xong", "done", "", "100.000đ", "xong"),
  o("ngl202.30k.13/10(8418) m38", "NGL", "M38", 13, 30000, 30000, "15/10", "19/10", "Xong", "done", "", "1.5$", "xong"),
  o("ngl203.30k.13/10(7467) m38", "NGL", "M38", 14, 27900, 30000, "15/10", "19/10", "Trễ 2 ngày", "late", "", "1.5$", "cay"),
  o("NGL204.1+41K.16/10(4907) M10", "Tay", "M10", 17, 1095, 1000, "16/10", "16/10", "Xong", "done", "Đơn thử", "0đ", "xong"),
  o("mkhoa.190+102K.19/10(1948) M101", "Khách VN", "M101", 8, 55700, 190000, "19/10", "02/11", "12 ngày", "ok", "B3D", "", "cay"),
  o("duyle.70K.19/10(1217) M38", "Khách VN", "M38", 5, 20950, 70000, "19/10", "28/10", "7 ngày", "ok", "", "", "cay"),
  o("NGL225.350-17K.19/10(2505) M56", "NGL", "M56", 9, 34100, 333000, "19/10", "08/11", "18 ngày", "ok", "", "6.3$", "cay"),
  o("NGL226.30+5K.19/10(0015) M101", "NGL", "M101", 4, 14880, 30000, "19/10", "23/10", "2 ngày", "ok", "", "1.5$", "cay"),
  o("NGL227.570+36K.19/10(9939) M38", "NGL", "M38", 2, 58400, 570000, "19/10", "16/11", "26 ngày", "ok", "", "", "cay"),
  o("NGL229.60K.19/10(3454) M38", "NGL", "M38", 11, 21300, 60000, "19/10", "27/10", "6 ngày", "ok", "", "2.7$", "cay"),
  o("kiet.150K.20/10(5521) M2", "Khách VN", "M2", 3, 41200, 150000, "20/10", "30/10", "Acc bị khóa", "ban", "Khách đổi pass giữa chừng", "", "ban"),
  o("NGL234.60K.03/11(7781) M2", "NGL", "M2", 5, 18200, 60000, "03/11", "09/11", "5 ngày", "ok", "", "2.7$", "cay"),
  o("iml4.100k.04/11(3310) m48", "IML", "M48", 4, 2100, 100000, "04/11", "11/11", "7 ngày", "ok", "", "150.000đ", "cay"),
  o("hoang.50K.04/11(9012) M10", "Khách VN", "M10", 6, 0, 50000, "04/11", "07/11", "3 ngày", "ok", "", "", "cay"),
];
export const curOf = (src) => (src === "NGL" ? "usd" : src === "Tay" ? "both" : "vnd");

// ---- doanh thu theo tháng: tiền Việt (triệu) + đô ----
// Tổng khớp số đã chốt; cách chia NGL/IML/Khách VN là MẪU.
// NGL trả bằng đô; IML (Ismoilov) và khách VN trả tiền Việt.
export const months = [
  { m: "T6", iml: 9.6, vn: 18.4, usd: 0 },
  { m: "T7", iml: 46.3, vn: 63.6, usd: 0 },
  { m: "T8", iml: 19.2, vn: 25.7, usd: 0 },
  { m: "T9", iml: 21.5, vn: 26.6, usd: 499.8 },
  { m: "T10", iml: 6.15, vn: 8.3, usd: 232.8 },
];

// ---- theo ngày tháng 10 (mẫu, tổng khớp T10) ----
function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
export const daysOct = (() => {
  const r = seeded(4242);
  const raw = Array.from({ length: 31 }, (_, i) => ({ d: i + 1, a: 0.3 + r(), b: 0.3 + r(), c: r() < 0.25 ? 0 : 0.2 + r() }));
  const sum = (k) => raw.reduce((a, x) => a + x[k], 0);
  const SA = sum("a"), SB = sum("b"), SC = sum("c");
  return raw.map((x) => ({ d: x.d, usd: +((x.c / SC) * 232.8).toFixed(2), iml: (x.a / SA) * 6.15, vn: (x.b / SB) * 8.3 }));
})();

export const partnerDay = [
  { n: "Nextgen DLS", s: "4 đơn NGL225 → NGL229", v: "10,5$", vnd: "270.900đ", warn: "1 đơn chưa nhập giá" },
  { n: "Ismoilov", s: "Không có đơn", v: "0đ", vnd: "", warn: "" },
  { n: "Khách Việt Nam", s: "2 đơn", v: "0đ", vnd: "", warn: "2 đơn chưa nhập giá" },
];

// Công nợ theo KỲ: kỳ mở từ ngày sau lần thanh toán trước tới hôm nay
export const debts = [
  {
    n: "Nextgen DLS", cur: "usd", from: "03/11",
    orders: [["NGL230.60K.03/11", 2.7], ["NGL231.150K.03/11", 6.3], ["NGL232.30K.04/11", 1.5], ["NGL234.60K.03/11", 2.7]],
    skipped: "NGL233 đang treo, chưa tính",
    history: [{ k: "26/10 → 02/11", n: 18, amt: 60, paid: "02/11" }, { k: "19/10 → 25/10", n: 21, amt: 71.6, paid: "26/10" }],
  },
  {
    n: "Ismoilov", cur: "vnd", from: "03/11",
    orders: [["iml1.100k.03/11", 150000], ["iml2.50k.03/11", 100000], ["iml1.30k.04/11", 50000], ["iml4.100k.04/11", 150000]],
    skipped: "",
    history: [{ k: "27/10 → 02/11", n: 21, amt: 3150000, paid: "03/11" }, { k: "20/10 → 26/10", n: 17, amt: 2600000, paid: "27/10" }],
  },
];

export const fmt = (n) => Number(n).toLocaleString("vi-VN");
