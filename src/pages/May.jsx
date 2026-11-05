import { useState, useMemo } from "react";
import { Pause, Cpu, HeartPulse, AlertTriangle } from "lucide-react";
import { Badge, Dot, GoldBar, Gold, Gems, HudPill, Button, Segmented, cn } from "../ui.jsx";
import { machines as mMau, tabsOf, fmt } from "../data.js";
import { eta as etaOf, pctOf, CPU_CAO } from "../live.js";

const ST = {
  cay: { l: "Đang cày", tone: "run" },
  cho: { l: "Full 100 trận", tone: "wait" },
  san: { l: "Sẵn sàng", tone: "ok" },
  sach: { l: "Tab sạch", tone: "ok" },
  warn: { l: "Cần xem", tone: "warn" },
  off: { l: "Tắt", tone: "off" },
  dung: { l: "Tạm dừng", tone: "wait" },
  xong: { l: "Xong đơn", tone: "ok" },
  ngung: { l: "Ngưng gói", tone: "off" },
  tao: { l: "Đang tạo acc", tone: "run" },
  nhan: { l: "Đang nhận đơn", tone: "gold" },
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
          <p><span className="font-semibold">Máy chạy web_tomtat bản cũ ({m.ban}).</span> Web chưa tự biết đơn đã xong khi tab bị xóa + clone. Cài gói <span className="font-semibold">WEB_TOMTAT_C</span>.</p>
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
          { k: "xong", l: "Xong đơn", dot: "ok", c: cnt("xong") },
          { k: "ngung", l: "Ngưng gói", dot: "off", c: cnt("ngung") },
          { k: "off", l: "Tắt", dot: "off", c: cnt("off") },
        ].filter((it) => it.k === "all" || it.c > 0)} />}

      {busy.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {busy.map((t) => <TabCard key={t.i} t={t} real={real} />)}
        </div>
      )}
      {idle.length > 0 && (
        <div>
          {busy.length > 0 && <h2 className="mb-2 text-[13px] font-semibold text-ink-3">Tab không có gói đang cày</h2>}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{idle.map((t) => <TabCard key={t.i} t={t} real={real} />)}</div>
        </div>
      )}
      {!list.length && m.s !== "none" && <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-[14px] text-ink-3">Máy này không có tab nào ở trạng thái này.</p>}
      <p className="text-[13px] text-ink-3">Nút Tạm dừng / Chạy tiếp làm ở lát 5, mỗi lần bấm phải xác nhận số tab.</p>
    </div>
  );
}

function TabCard({ t, real }) {
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
      : t.pkg ? t.name : t.k === "sach" ? (t.ten || "Chờ Agent dùng") : t.k === "san" ? (t.ten ? `${t.ten} · chờ đơn` : "Chờ đơn") : t.ten && t.k === "off" ? t.ten : t.k === "tao" ? "Đang chuẩn bị acc mới" : t.k === "nhan" ? "Đơn vừa gán" : "Không có gói";
    return (
      <article className={cn("rounded-2xl border px-4 py-3", t.k === "san" ? "border-ok/25 bg-ok-soft/60" : t.k === "sach" ? "border-ok/20 bg-ok-soft/25" : t.k === "warn" ? "border-warn/40 bg-warn-soft/40" : "border-line-2 bg-white/60")}>
        <div className="flex items-center gap-3">
          <span className="tnum w-12 shrink-0 text-[13px] font-semibold text-ink-3">Tab {t.i}</span>
          <Badge tone={st.tone} dot>{st.l}</Badge>
          <span className="ml-auto min-w-0 truncate text-[13px] text-ink-3" title={right}>{right}</span>
        </div>
        {real && (t.kq || t.health) && <p className={cn("mt-1.5 truncate text-[12.5px]", t.health ? "font-medium text-warn-ink" : "text-ink-3")} title={t.health || t.kq}>{t.health || `Kết quả: ${t.kq}`}</p>}
      </article>
    );
  }

  return (
    <article className={cn("rounded-2xl border bg-white px-4 pt-3.5 pb-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-float)]", t.k === "warn" ? "border-warn/40" : "border-line")}>
      <div className="flex items-center gap-2">
        <span className="tnum text-[13px] font-semibold text-ink-3">Tab {t.i}</span>
        <Badge tone={st.tone} dot>{st.l}</Badge>
        <Button size="iconSm" variant="ghost" className="ml-auto" disabled title="Tạm dừng · làm ở lát 5" aria-label={`Tạm dừng tab ${t.i} (lát 5)`}><Pause /></Button>
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
    </article>
  );
}
