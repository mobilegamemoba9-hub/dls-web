import { useState, useMemo } from "react";
import { Pause, Cpu, HeartPulse, AlertTriangle } from "lucide-react";
import { Badge, Dot, GoldBar, Gold, HudPill, Button, Segmented, cn } from "../ui.jsx";
import { machines, tabsOf, fmt } from "../data.js";

const ST = {
  cay: { l: "Đang cày", tone: "run" },
  cho: { l: "Full 100 trận", tone: "wait" },
  san: { l: "Sẵn sàng", tone: "ok" },
  warn: { l: "Cần xem", tone: "warn" },
  off: { l: "Tắt", tone: "off" },
};
const MS = { ok: { l: "Ổn", tone: "ok" }, warn: { l: "Có lỗi", tone: "warn" }, err: { l: "Mất tín hiệu", tone: "err" } };

export default function May({ code }) {
  const cur = machines.some((m) => m.code === code) ? code : machines[0].code;
  const m = machines.find((x) => x.code === cur);
  const tabs = useMemo(() => tabsOf(cur), [cur]);
  const [f, setF] = useState("all");
  const cnt = (k) => tabs.filter((t) => t.k === k).length;
  const list = tabs.filter((t) => f === "all" || t.k === f);
  const ORD = { warn: 0, cay: 1, cho: 2 };
  const busy = list.filter((t) => t.k in ORD).sort((a, b) => ORD[a.k] - ORD[b.k] || a.i - b.i);
  const idle = list.filter((t) => !(t.k in ORD));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">Máy {m.code}</h1>
          <Badge tone={MS[m.s].tone} dot>{MS[m.s].l}</Badge>
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-ink-2">
          <span className="inline-flex items-center gap-1.5"><HeartPulse className="size-4 text-ink-3" />Nhịp tim {m.hb} trước</span>
          {m.cpu > 85 && <span className="inline-flex items-center gap-1.5 font-medium text-warn-ink"><Cpu className="size-4" />CPU {m.cpu}%, cao bất thường</span>}
          <span className="text-ink-3">Trận và sản lượng tính từ 7h sáng (game reset 100 trận)</span>
        </p>
        <div className="mt-4 inline-flex max-w-full flex-wrap items-stretch overflow-hidden rounded-xl border border-[var(--acc-panel-line)]" style={{ background: "var(--acc-panel)" }}>
          <div className="flex flex-col justify-center border-r border-[var(--acc-panel-line)] px-4 py-2.5">
            <div className="font-[Barlow_Condensed,var(--font-sans)] text-[19px] leading-none font-semibold text-[var(--acc-panel-ink)]">Sản lượng hôm nay</div>
            <div className="mt-1 text-[12px] text-[var(--acc-panel-sub)]">Máy {m.code} · từ 7:00</div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-2.5">
            <HudPill kind="gem" n={tabs.reduce((a, t) => a + t.kc, 0)} size="lg" />
            <HudPill kind="coin" n={tabs.reduce((a, t) => a + t.today, 0)} size="lg" />
          </div>
        </div>
      </div>

      {/* chọn máy */}
      <nav aria-label="Chọn máy" className="flex flex-wrap gap-2">
        {machines.map((x) => (
          <a key={x.code} href={`#may/${x.code}`} aria-current={x.code === cur ? "page" : undefined}
            className={cn("inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[14px] font-semibold transition-colors tnum",
              x.code === cur ? "border-shell bg-shell text-shell-ink" : "border-line bg-white text-ink hover:bg-wash")}>
            <Dot tone={MS[x.s].tone} pulse={x.s === "err"} className="size-2" />{x.code}
          </a>
        ))}
      </nav>

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

      <Segmented label="Lọc tab theo trạng thái" value={f} onChange={setF} className="w-fit max-w-full"
        items={[
          { k: "all", l: "Tất cả", c: tabs.length },
          { k: "cay", l: "Đang cày", dot: "run", c: cnt("cay") },
          { k: "cho", l: "Full 100 trận", dot: "wait", c: cnt("cho") },
          { k: "san", l: "Sẵn sàng", dot: "ok", c: cnt("san") },
          { k: "warn", l: "Cần xem", dot: "warn", c: cnt("warn"), ct: cnt("warn") ? "warn" : undefined },
          { k: "off", l: "Tắt", dot: "off", c: cnt("off") },
        ].filter((it) => it.k === "all" || it.c > 0)} />

      {busy.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {busy.map((t) => <TabCard key={t.i} t={t} />)}
        </div>
      )}
      {idle.length > 0 && (
        <div>
          {busy.length > 0 && <h2 className="mb-2 text-[13px] font-semibold text-ink-3">Tab không có gói đang cày</h2>}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{idle.map((t) => <TabCard key={t.i} t={t} />)}</div>
        </div>
      )}
      {!list.length && <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-[14px] text-ink-3">Máy này không có tab nào ở trạng thái này.</p>}
      <p className="text-[13px] text-ink-3">Nút Tạm dừng / Chạy tiếp làm ở lát 5, mỗi lần bấm phải xác nhận số tab.</p>
    </div>
  );
}

function TabCard({ t }) {
  const has = t.k !== "san" && t.k !== "off";
  const st = ST[t.k];
  const left = Math.max(0, t.tg - t.g), ml = t.gpm ? Math.ceil(left / t.gpm) : 0, rem = 100 - t.mt; /* ml = số trận còn cần */
  const pct = has ? Math.min(100, (t.g / t.tg) * 100) : 0;
  const dd = Math.ceil((ml - rem) / 100);
  const eta = !has ? "" : ml <= rem ? "Hôm nay" : dd === 1 ? "Ngày mai" : `~${dd} ngày`;

  if (!has) {
    return (
      <article className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3", t.k === "san" ? "border-ok/25 bg-ok-soft/60" : "border-line-2 bg-white/60")}>
        <span className="tnum w-12 text-[13px] font-semibold text-ink-3">Tab {t.i}</span>
        <Badge tone={st.tone} dot>{st.l}</Badge>
        <span className="ml-auto text-[13px] text-ink-3">{t.k === "san" ? t.name : "Không có gói"}</span>
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
        <span className="flex items-center gap-1"><Gold n={t.g} className="text-gold-ink" /><span className="text-ink-3">/ {fmt(t.tg)}</span></span>
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
      </dl>
      {t.health && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-warn-soft px-2.5 py-1.5 text-[13px] font-medium text-warn-ink"><AlertTriangle className="size-3.5" />{t.health}</p>}
    </article>
  );
}
