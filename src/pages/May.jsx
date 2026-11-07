import { useState, useMemo, useEffect } from "react";
import { Cpu, HeartPulse, AlertTriangle, SlidersHorizontal, Undo2, X } from "lucide-react";
import { Badge, Dot, GoldBar, Gold, Gems, HudPill, Button, Segmented, cn } from "../ui.jsx";
import { machines as mMau, tabsOf, fmt } from "../data.js";
import { eta as etaOf, pctOf, CPU_CAO } from "../live.js";
import { useLenh, LOAI, KQ, hoanTac } from "../lenh.js";

const ST = {
  cay: { l: "Đang cày", tone: "run" },
  cho: { l: "Full 100 trận", tone: "wait" },
  san: { l: "Sẵn sàng", tone: "ok" },
  sach: { l: "Tab sạch", tone: "ok" },
  dp: { l: "Dự phòng", tone: "off" },
  warn: { l: "Cần xem", tone: "warn" },
  off: { l: "Tắt", tone: "off" },
  dung: { l: "Tạm dừng", tone: "wait" },
  xong: { l: "Xong đơn", tone: "ok" },
  ngung: { l: "Ngưng gói", tone: "off" },
  tao: { l: "Đang tạo acc", tone: "run" },
  nhan: { l: "Đang nhận đơn", tone: "gold" },
  tay: { l: "Lấy tay", tone: "gold" },
};
const MS = { ok: { l: "Ổn", tone: "ok" }, warn: { l: "Có lỗi", tone: "warn" }, err: { l: "Mất tín hiệu", tone: "err" }, none: { l: "Chưa gửi dữ liệu", tone: "off" } };
const HAS = ["cay", "cho", "dung", "warn"];

export default function May({ code, live }) {
  const real = !!live;
  const machines = real ? live.machines : mMau;
  const first = real ? (live.real[0] || machines[0]) : machines[0];
  const cur = machines.some((m) => m.code === code) ? code : first.code;
  const m = machines.find((x) => x.code === cur);
  const tabs = useMemo(() => (real ? m.tabs : tabsOf(cur)), [cur, real, m]);
  const [f, setF] = useState("all");
  const cnt = (k) => tabs.filter((t) => t.k === k).length;
  const list = tabs.filter((t) => f === "all" || t.k === f).sort((a, b) => a.i - b.i);
  const isBusy = (t) => ["warn", "cay", "cho", "dung"].includes(t.k) && (!real || t.pkg);
  const busy = list.filter(isBusy);                          // tab có gói: theo số tab, nhỏ nhất trên
  const idle = list.filter((t) => !isBusy(t));               // ô nhỏ bên dưới: cũng theo số tab
  const nut = real && m.nut && (m.s === "ok" || m.s === "warn");   // (lát 5) máy có bản nút + còn gửi dữ liệu
  const L = useLenh(real && m.s !== "none" ? m.m : null, nut);
  const choTab = (i) => L.rows.filter((r) => r.k === "cho" && r.tab === i);
  // tạm dừng / tiếp tục vừa gửi mà máy chưa gửi tóm tắt mới (≤ 2 phút) -> theo lệnh mới nhất để hiện đúng nút
  const dungMoi = (i) => {
    const r = L.rows.find((x) => x.tab === i && (x.l === "tam_dung" || x.l === "chay_tiep") && (x.k === "cho" || x.k === "ok"));
    return r && r.t > (m.t || 0) * 1000 ? r.l === "tam_dung" : null;
  };
  const nut7 = nut && m.nut7;                                         // (07/11) máy có nút Lấy tay / việc Sheet
  const card = (t) => <TabCard key={t.i} t={t} real={real} nut={nut} nut7={nut7} gui={L.gui} cho={choTab(t.i)} may={m.code} dm={dungMoi(t.i)} />;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">Máy {m.code}</h1>
          <Badge tone={MS[m.s].tone} dot>{MS[m.s].l}</Badge>
          {real && m.s !== "none" && <span title={m.cu ? "Máy chạy bản cũ: web chưa tự biết đơn đã xong khi tab bị xóa + clone. Cài gói WEB_TOMTAT_C." : "web_tomtat bản mới nhất"}
            className={cn("rounded-lg px-2 py-0.5 text-[12px] font-semibold tnum", m.cu ? "bg-warn-soft text-warn-ink" : "bg-wash text-ink-3")}>{m.cu ? `Bản cũ ${m.ban}` : `Bản ${m.ban}`}</span>}
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-ink-2">
          {m.s !== "none" && <span className="inline-flex items-center gap-1.5"><HeartPulse className="size-4 text-ink-3" />{real ? "Cập nhật" : "Nhịp tim"} {m.hb} trước</span>}
          {m.cpu > CPU_CAO && <span className="inline-flex items-center gap-1.5 font-medium text-warn-ink"><Cpu className="size-4" />CPU {m.cpu}%, cao bất thường</span>}
          {real && m.s !== "none" && m.cpu != null && m.cpu <= CPU_CAO && <span className="inline-flex items-center gap-1.5"><Cpu className="size-4 text-ink-3" />CPU {m.cpu}%{m.ram != null && ` · RAM ${m.ram}%`}</span>}
          <span className="text-ink-3">Trận và sản lượng tính từ 7h sáng (game reset 100 trận)</span>
        </p>
        {m.s !== "none" && <div className="mt-4 inline-flex max-w-full flex-wrap items-stretch overflow-hidden rounded-xl border border-[var(--acc-panel-line)]" style={{ background: "var(--acc-panel)" }}>
          <div className="flex flex-col justify-center border-r border-[var(--acc-panel-line)] px-4 py-2.5">
            <div className="font-[Barlow_Condensed,var(--font-sans)] text-[19px] leading-none font-semibold text-[var(--acc-panel-ink)]">Sản lượng hôm nay</div>
            <div className="mt-1 text-[12px] text-[var(--acc-panel-sub)]">Máy {m.code} · từ 7:00</div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-2.5">
            <HudPill kind="gem" n={tabs.reduce((a, t) => a + t.kc, 0)} size="lg" />
            <HudPill kind="coin" n={tabs.reduce((a, t) => a + t.today, 0)} size="lg" />
          </div>
        </div>}
      </div>

      {/* chọn máy */}
      <nav aria-label="Chọn máy" className="flex flex-wrap gap-2">
        {machines.map((x) => (
          <a key={x.code} href={`#may/${x.code}`} aria-current={x.code === cur ? "page" : undefined}
            className={cn("inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[14px] font-semibold transition-colors tnum",
              x.code === cur ? "border-shell bg-shell text-shell-ink" : x.s === "none" ? "border-dashed border-line bg-white/50 text-ink-3 hover:bg-white" : "border-line bg-white text-ink hover:bg-wash")}>
            <Dot tone={MS[x.s].tone} pulse={x.s === "err"} className="size-2" />{x.code}
            {real && x.s !== "none" && x.cu && <span title={`Bản cũ ${x.ban} - chưa cài gói WEB_TOMTAT_C`} className={cn("text-[11px] font-semibold", x.code === cur ? "opacity-80" : "text-warn-ink")}>cũ</span>}
          </a>
        ))}
      </nav>

      {m.s === "none" && (
        <div className="rounded-2xl border border-dashed border-line bg-white/60 px-4 py-6 text-[14px] text-ink-2">
          <p className="font-semibold text-ink">Máy {m.code} chưa gửi dữ liệu lên web.</p>
          <p className="mt-1">Chưa cài: cài gói <span className="font-semibold">WEB_TOMTAT_C</span> trên máy này để thấy từng tab ở đây.</p>
        </div>
      )}
      {real && m.s !== "none" && m.cu && (
        <div className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3 text-[14px] text-warn-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p><span className="font-semibold">Máy chạy web_tomtat bản cũ ({m.ban}).</span> {m.ban === "05/11d" ? <>Chưa có nút Lấy tay / Đã đổi tay việc Sheet. Cài gói <span className="font-semibold">GOI_07-11_NUT_WEB</span>.</> : <>{m.ban === "05/11c" ? "Chưa có nút điều khiển trên web." : "Web chưa tự biết đơn đã xong khi tab bị xóa + clone, chưa có nút điều khiển."} Cài gói <span className="font-semibold">NUT_WEB</span>.</>}</p>
        </div>
      )}
      {m.s === "err" && (
        <div className="flex items-start gap-3 rounded-2xl border border-err/25 bg-err-soft px-4 py-3.5 text-[14px] text-err-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p><span className="font-semibold">Mất tín hiệu {m.hb}.</span> Số liệu dưới đây là lần cuối máy gửi lên. {m.why}.</p>
        </div>
      )}
      {m.s === "warn" && (
        <div className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3.5 text-[14px] text-warn-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>{m.why}.</p>
        </div>
      )}

      {m.s !== "none" && <Segmented label="Lọc tab theo trạng thái" value={f} onChange={setF} className="w-fit max-w-full"
        items={[
          { k: "all", l: "Tất cả", c: tabs.length },
          { k: "cay", l: "Đang cày", dot: "run", c: cnt("cay") },
          { k: "cho", l: "Full 100 trận", dot: "wait", c: cnt("cho") },
          { k: "san", l: "Sẵn sàng", dot: "ok", c: cnt("san") },
          { k: "sach", l: "Tab sạch", dot: "ok", c: cnt("sach") },
          { k: "warn", l: "Cần xem", dot: "warn", c: cnt("warn"), ct: cnt("warn") ? "warn" : undefined },
          { k: "dung", l: "Tạm dừng", dot: "wait", c: cnt("dung") },
          { k: "nhan", l: "Đang nhận đơn", dot: "gold", c: cnt("nhan") },
          { k: "tao", l: "Đang tạo acc", dot: "run", c: cnt("tao") },
          { k: "dp", l: "Dự phòng", dot: "off", c: cnt("dp") },
          { k: "tay", l: "Lấy tay", dot: "gold", c: cnt("tay") },
          { k: "xong", l: "Xong đơn", dot: "ok", c: cnt("xong") },
          { k: "ngung", l: "Ngưng gói", dot: "off", c: cnt("ngung") },
          { k: "off", l: "Tắt", dot: "off", c: cnt("off") },
        ].filter((it) => it.k === "all" || it.c > 0)} />}

      {nut7 && m.sj.length > 0 && <SheetViec sj={m.sj} gui={L.gui} cho={L.rows.filter((r) => r.k === "cho" && r.l === "viec_sheet")} />}
      {real && m.s !== "none" && (L.rows.length > 0 || L.loi) && <LenhPanel L={L} nut={nut} />}

      {busy.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {busy.map(card)}
        </div>
      )}
      {idle.length > 0 && (
        <div>
          {busy.length > 0 && <h2 className="mb-2 text-[13px] font-semibold text-ink-3">Tab không có gói đang cày</h2>}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{idle.map(card)}</div>
        </div>
      )}
      {!list.length && m.s !== "none" && <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-[14px] text-ink-3">Máy này không có tab nào ở trạng thái này.</p>}
      {real && m.s !== "none" && <p className="text-[13px] text-ink-3">{nut
        ? "Nút dưới mỗi tab: mở khóa tab lỗi, cờ DIRTY, ngày bù, đóng gói đã dừng, tạm dừng / chạy tiếp bot (như nút ⏸ ▶ Dashboard). Máy hỏi lệnh mỗi 1 phút, tự kiểm lại điều kiện an toàn trước khi làm; lệnh quá 10 phút thì hết hạn. Không có nút tắt/mở bot, LD hay xóa tab."
        : m.s === "err" ? "Máy mất tín hiệu: tạm ẩn nút điều khiển." : "Nút điều khiển: cài gói NUT_WEB trên máy này."}</p>}
    </div>
  );
}

function TabCard({ t, real, nut, nut7 = false, gui, cho = [], may, dm = null }) {
  const has = real ? t.pkg && HAS.includes(t.k) : t.k !== "san" && t.k !== "off";
  const st = ST[t.k] || ST.off;
  const pct = !has ? 0 : real ? pctOf(t) : Math.min(100, (t.g / t.tg) * 100);
  let eta = "";
  if (has && real) eta = t.k === "warn" ? "Bot đã dừng" : etaOf(t).txt;
  else if (has) {
    const left = Math.max(0, t.tg - t.g), ml = t.gpm ? Math.ceil(left / t.gpm) : 0, rem = 100 - t.mt; /* ml = số trận còn cần */
    const dd = Math.ceil((ml - rem) / 100);
    eta = ml <= rem ? "Hôm nay" : dd === 1 ? "Ngày mai" : `~${dd} ngày`;
  }

  if (!has) {
    const right = !real ? (t.k === "san" ? t.name : "Không có gói")
      : t.pkg ? t.name : t.k === "sach" ? (t.ten || "Chờ Agent dùng") : t.k === "dp" ? (t.ten ? `${t.ten} · game chết, chờ dùng lại` : "Game chết, chờ dùng lại") : t.k === "san" ? (t.ten ? `${t.ten} · chờ đơn` : "Chờ đơn") : t.ten && t.k === "off" ? t.ten : t.k === "tao" ? "Đang chuẩn bị acc mới" : t.k === "nhan" ? "Đơn vừa gán" : "Không có gói";
    return (
      <article className={cn("rounded-2xl border px-4 py-3", t.k === "san" ? "border-ok/25 bg-ok-soft/60" : t.k === "sach" ? "border-ok/20 bg-ok-soft/25" : t.k === "warn" ? "border-warn/40 bg-warn-soft/40" : "border-line-2 bg-white/60")}>
        <div className="flex items-center gap-3">
          <span className="tnum w-12 shrink-0 text-[13px] font-semibold text-ink-3">Tab {t.i}</span>
          <Badge tone={st.tone} dot>{st.l}</Badge>
          <span className="ml-auto min-w-0 truncate text-[13px] text-ink-3" title={right}>{right}</span>
        </div>
        {real && (t.kq || t.health) && <p className={cn("mt-1.5 truncate text-[12.5px]", t.health ? "font-medium text-warn-ink" : "text-ink-3")} title={t.health || t.kq}>{t.health || `Kết quả: ${t.kq}`}</p>}
        {nut && <NutTab t={t} gui={gui} cho={cho} may={may} dm={dm} nut7={nut7} />}
      </article>
    );
  }

  return (
    <article className={cn("rounded-2xl border bg-white px-4 pt-3.5 pb-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-float)]", t.k === "warn" ? "border-warn/40" : "border-line")}>
      <div className="flex items-center gap-2">
        <span className="tnum text-[13px] font-semibold text-ink-3">Tab {t.i}</span>
        <Badge tone={st.tone} dot>{st.l}</Badge>
      </div>
      <div className="mt-1.5 truncate text-[14.5px] font-semibold" title={t.name}>{t.name}</div>

      <div className="mt-3 flex items-baseline justify-between text-[13px]">
        <span className="flex items-center gap-1"><Gold n={t.g} className="text-gold-ink" /><span className="text-ink-3">{real && !t.tg && t.td ? `· gói ${t.td} ngày` : `/ ${fmt(t.tg)}`}</span></span>
        <span className="tnum font-semibold">{Math.round(pct)}%</span>
      </div>
      <GoldBar pct={pct} className="mt-1.5" />

      <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line-2 pt-3">
        <span className="w-full text-[12px] text-ink-3">Sản lượng hôm nay</span>
        <HudPill kind="gem" n={t.kc} />
        <HudPill kind="coin" n={t.today} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
        <div><dt className="text-ink-3">Trận hôm nay</dt><dd className={cn("tnum font-semibold", t.mt >= 100 && "text-wait-ink")}>{t.mt}<span className="font-normal text-ink-3">/100</span></dd></div>
        <div><dt className="text-ink-3">Dự kiến xong</dt><dd className={cn("font-semibold", eta === "Hôm nay" && "text-ok-ink")}>{t.k === "cho" ? `${eta} · chờ 7h` : eta}</dd></div>
        {real && t.tk > 0 && <div><dt className="text-ink-3">Kim cương gói</dt><dd className="flex items-center gap-1"><Gems n={t.kt} className="text-gem-ink" /><span className="text-ink-3">/ {fmt(t.tk)}</span></dd></div>}
        {real && t.bd && <div><dt className="text-ink-3">Bắt đầu</dt><dd className="tnum font-semibold">{t.bd.slice(8, 10)}/{t.bd.slice(5, 7)} {t.bd.slice(11, 16)}</dd></div>}
      </dl>
      {real && t.san > 0 && <p className="mt-2 text-[12.5px] text-ink-3">Acc chưa full sân · tính theo số dư (đã trừ phí sân {fmt(t.san)})</p>}
      {t.health && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-warn-soft px-2.5 py-1.5 text-[13px] font-medium text-warn-ink"><AlertTriangle className="size-3.5" />{t.health}</p>}
      {nut && <NutTab t={t} gui={gui} cho={cho} may={may} dm={dm} nut7={nut7} />}
    </article>
  );
}

/* ================= LÁT 5: NÚT ĐIỀU KHIỂN AN TOÀN =================
   Mỗi tab chỉ hiện nút hợp với tình trạng tab (máy vẫn tự kiểm lại trước khi làm).
   Xác nhận: Mở khóa / Đặt lại cờ / Đóng gói / Mở lại gói = bấm 2 lần. Gỡ cờ DIRTY, Ngày bù, Tạm dừng, Chạy tiếp = gõ lại số tab. */
const SO_TAB = new Set(["go_dirty", "ngay_bu", "tam_dung", "chay_tiep", "lay_tab"]);
const NEW_RX = /^NEW\d+$/i;
const NGAY = [-1, -0.5, 0.5, 1, 2];
const soNgay = (x) => (x > 0 ? "+" : "−") + String(Math.abs(x)).replace(".", ",");

function tacVu(t, dm = null, nut7 = false) {
  const out = [];
  if (nut7 && t.k === "san" && !t.pkg && NEW_RX.test(t.ten)) out.push({ l: "lay_tab" });      // (07/11) tab READY -> lấy tay
  if (nut7 && t.lt && !t.pkg) out.push({ l: "lay_huy" });
  if (t.kl && !t.pkg) out.push({ l: "mo_khoa" });
  if (t.co === "D") out.push(NEW_RX.test(t.ten) ? { l: "go_dirty" } : { l: "go_dirty", khong: `Tên giả lập "${t.ten || "?"}" chưa phải NEW<số>: chưa xóa + clone lại thì máy sẽ từ chối.` });
  if (t.k === "sach" && !t.co && !t.pkg) out.push({ l: "dat_dirty" });
  if (t.pkg && t.p != null && t.td > 0 && ["cay", "cho", "dung", "warn"].includes(t.k) && !t.ps) out.push({ l: "ngay_bu" });
  if (t.ps && t.p != null) out.push({ l: "dong_goi" });
  // dm: true = vừa gửi Tạm dừng (máy chưa báo tóm tắt mới), false = vừa gửi Tiếp tục, null = theo dữ liệu máy
  const dangDung = dm ?? (t.k === "dung");
  if (t.pkg && dangDung) out.push({ l: "chay_tiep" });
  else if (t.pkg && t.p != null && !t.ps && (t.k === "cay" || t.k === "dung" || (t.k === "cho" && !t.nghi))) out.push({ l: "tam_dung" });
  return out;
}

export function useHaiLan(ms = 5000) {
  const [lan, setLan] = useState(false);
  useEffect(() => { if (!lan) return; const id = setTimeout(() => setLan(false), ms); return () => clearTimeout(id); }, [lan, ms]);
  return [lan, setLan];
}

function NutTab({ t, gui, cho, may, dm, nut7 }) {
  const acts = tacVu(t, dm, nut7);
  const [mo, setMo] = useState(null);           // lệnh đang mở hộp xác nhận
  const [so, setSo] = useState("");
  const [ngay, setNgay] = useState(1);
  const [lan, setLan] = useHaiLan();
  const [tt, setTt] = useState("");             // thông báo sau khi gửi
  const [dang, setDang] = useState(false);
  if (!acts.length && !cho.length) return null;
  const a = acts.find((x) => x.l === mo);
  const canSo = a && SO_TAB.has(a.l);
  const okSo = !canSo || so.trim() === String(t.i);
  const send = async () => {
    if (!a || dang) return;
    if (!canSo && !lan) { setLan(true); return; }
    setDang(true);
    try {
      await gui({ l: a.l, tab: t.i, p: ["ngay_bu", "dong_goi", "tam_dung", "chay_tiep"].includes(a.l) ? t.p ?? undefined : undefined, so: a.l === "ngay_bu" ? ngay : undefined, ai: t.name || t.ten || "" });
      setTt(`Đã gửi "${LOAI[a.l].l}" tab ${t.i} · máy làm trong ≤ 1 phút`); setMo(null); setSo(""); setLan(false);
    } catch (e) { setTt("Chưa gửi được: " + ((e && (e.code || e.message)) || "lỗi mạng")); }
    finally { setDang(false); }
  };
  return (
    <div className="mt-2.5 border-t border-line-2 pt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <SlidersHorizontal className="size-3.5 text-ink-3" aria-hidden="true" />
        {acts.map((x) => (
          <button key={x.l} type="button" onClick={() => { setMo(mo === x.l ? null : x.l); setSo(""); setLan(false); setTt(""); }} aria-expanded={mo === x.l}
            className={cn("h-7 cursor-pointer rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors", mo === x.l ? "border-shell bg-shell text-shell-ink" : "border-line bg-white text-ink-2 hover:bg-wash")}>
            {LOAI[x.l].l}
          </button>
        ))}
        {cho.map((r) => <Badge key={r.id} tone="run" dot className="text-[11.5px]">Chờ máy: {LOAI[r.l]?.l || r.l}</Badge>)}
      </div>
      {tt && !a && <p className="mt-1.5 text-[12.5px] text-ink-2" role="status">{tt}</p>}
      {a && (
        <div className="mt-2 rounded-xl border border-line bg-wash/60 p-3 text-[13px]">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-ink-2"><span className="font-semibold text-ink">{LOAI[a.l].l} · {may} tab {t.i}.</span> {LOAI[a.l].g}{a.l === "ngay_bu" ? ` (gói ${t.td} ngày).` : "."}</p>
            <button type="button" onClick={() => setMo(null)} aria-label="Đóng" className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-ink-3 hover:bg-white"><X className="size-3.5" /></button>
          </div>
          {a.khong && <p className="mt-1.5 font-medium text-warn-ink">{a.khong}</p>}
          {a.l === "go_dirty" && !a.khong && <p className="mt-1.5 font-medium text-warn-ink">Chỉ gửi khi CHẮC tab đã xóa + clone lại. Bấm nhầm: dùng "Đặt lại cờ DIRTY".</p>}
          {a.l === "lay_tab" && <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-ink-2"><li>Gửi lệnh, chờ "Đã làm" (≤ 1 phút).</li><li>Trên máy: TẮT tab {t.i} → đổi tên bằng oslink (không bắt đầu NEW) → mở lại → nhập code tay.</li><li>Đổi ý TRƯỚC khi tắt / đổi tên: nút "Hủy lấy tay".</li></ol>}
          {a.l === "lay_huy" && <p className="mt-1.5 font-medium text-warn-ink">Chỉ gửi khi tab {t.i} CHƯA tắt và CHƯA đổi tên (vẫn ở màn nhập code). Máy kiểm lại, sai thì từ chối.</p>}
          {a.l === "ngay_bu" && (
            <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Số ngày bù">
              {NGAY.map((x) => (
                <button key={x} type="button" role="radio" aria-checked={ngay === x} onClick={() => setNgay(x)}
                  className={cn("tnum h-8 min-w-12 cursor-pointer rounded-lg border px-2 text-[13px] font-semibold", ngay === x ? "border-shell bg-shell text-shell-ink" : "border-line bg-white text-ink hover:bg-wash")}>{soNgay(x)} ngày</button>
              ))}
            </div>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {canSo && <input inputMode="numeric" value={so} onChange={(e) => setSo(e.target.value.replace(/[^0-9]/g, ""))} placeholder={`Gõ ${t.i} để xác nhận`} aria-label={`Gõ số tab ${t.i} để xác nhận`}
              className="tnum h-9 w-40 rounded-lg border border-line bg-white px-2.5 text-[14px] outline-none focus:border-shell" />}
            <Button size="sm" variant={lan ? "brand" : "default"} disabled={!okSo || dang || !!a.khong} onClick={send}>
              {dang ? "Đang gửi…" : canSo ? "Gửi lệnh" : lan ? "Bấm lần nữa để gửi" : "Gửi lệnh"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* (07/11) việc ghi Google Sheet bị kẹt "Cần đổi tay" của máy này: bạn sửa dòng đó trong Sheet rồi bấm "Đã đổi tay" (bấm 2 lần) */
function SheetViec({ sj, gui, cho }) {
  return (
    <section aria-label="Việc Sheet cần đổi tay" className="rounded-2xl border border-warn/30 bg-warn-soft/60 px-4 py-3">
      <h2 className="text-[14px] font-semibold text-warn-ink">Việc Sheet cần đổi tay · {sj.length}</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-2">Tool không tự ghi được "Đã Xong" vào Google Sheet. Mở Sheet, sửa đúng dòng của đơn, rồi bấm "Đã đổi tay".</p>
      <ul className="mt-1.5 divide-y divide-warn/20">
        {sj.map((x) => <SheetRow key={x.j} x={x} gui={gui} dang={cho.some((r) => r.j === x.j)} />)}
      </ul>
    </section>
  );
}

function SheetRow({ x, gui, dang }) {
  const [lan, setLan] = useHaiLan();
  const [tt, setTt] = useState("");
  const send = async () => {
    if (!lan) { setLan(true); return; }
    setLan(false);
    try { await gui({ l: "viec_sheet", tab: x.tab ?? 0, j: x.j, ai: x.n || "" }); setTt("Đã gửi · máy làm trong ≤ 1 phút"); }
    catch (e) { setTt("Chưa gửi được: " + ((e && (e.code || e.message)) || "lỗi mạng")); }
  };
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2 text-[13px]">
      <Badge tone="warn" className="text-[11.5px]">{x.k || "?"}</Badge>
      <span className="min-w-0 break-words font-semibold">{x.n || "(không tên)"}</span>
      <span className="tnum text-ink-3">{x.tab != null ? `tab ${x.tab} · ` : ""}việc {x.j}{x.t ? ` · ${x.t.slice(5, 16).replace("-", "/")}` : ""}</span>
      {dang ? <Badge tone="run" dot className="ml-auto text-[11.5px]">Chờ máy</Badge>
        : !tt && <Button size="sm" variant={lan ? "brand" : "default"} className="ml-auto h-7" onClick={send}>{lan ? "Bấm lần nữa" : "Đã đổi tay"}</Button>}
      {tt && <span className="ml-auto text-[12.5px] text-ink-2">{tt}</span>}
      {x.e && <p className="w-full min-w-0 break-words text-[12.5px] text-ink-3">Lỗi: {x.e}</p>}
    </li>
  );
}

export function LenhPanel({ L, nut, title = "Lệnh gửi máy" }) {
  return (
    <section aria-label="Lệnh gửi máy" className="rounded-2xl border border-line bg-white/70 px-4 py-3">
      <div className="flex items-center gap-2">
        <h2 className="text-[14px] font-semibold">{title}</h2>
        {L.conCho && <span className="text-[12px] text-ink-3">· tự xem lại mỗi 30 giây</span>}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={L.docKq}>Xem lại</Button>
      </div>
      {L.loi && <p className="mt-1 text-[12.5px] text-err-ink">{L.loi}</p>}
      <ul className="mt-1 divide-y divide-line-2">
        {L.rows.map((r) => <LenhRow key={r.id} r={r} gui={L.gui} nut={nut} />)}
      </ul>
    </section>
  );
}

function LenhRow({ r, gui, nut }) {
  const ht = hoanTac(r);
  const [lan, setLan] = useHaiLan();
  const [xong, setXong] = useState("");
  const k = KQ[r.k] || KQ.loi;
  const gio = r.t ? new Date(r.t).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "";
  const undo = async () => {
    if (!lan) { setLan(true); return; }
    try { await gui(ht); setXong("Đã gửi hoàn tác"); } catch (e) { setXong("Chưa gửi được: " + ((e && (e.code || e.message)) || "lỗi mạng")); }
    setLan(false);
  };
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2 text-[13px]">
      <Badge tone={k.tone} dot className="text-[11.5px]">{k.l}</Badge>
      <span className="font-semibold">{LOAI[r.l]?.l || r.l} · {r.oid != null ? `${r.s ? r.s + " · " : ""}đơn #${r.oid}` : `tab ${r.tab}`}{r.l === "viec_sheet" && r.j != null ? ` · việc Sheet ${r.j}` : ""}{r.l === "ngay_bu" && r.so != null ? ` (${soNgay(+r.so)})` : ""}</span>
      <span className="tnum text-ink-3">{gio}</span>
      {nut && ht && !xong && <Button size="sm" variant={lan ? "brand" : "ghost"} className="ml-auto h-7" onClick={undo}><Undo2 />{lan ? "Bấm lần nữa" : "Hoàn tác"}</Button>}
      {xong && <span className="ml-auto text-[12.5px] text-ink-2">{xong}</span>}
      {r.m && <p className="w-full min-w-0 break-words text-ink-2">{r.m}</p>}
    </li>
  );
}
