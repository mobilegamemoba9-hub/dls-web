import { useEffect, useRef, useState } from "react";
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Check, Copy } from "lucide-react";

export const cn = (...a) => twMerge(clsx(a));

export function useReducedMotion() {
  const q = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const [r, setR] = useState(q ? q.matches : false);
  useEffect(() => { if (!q) return; const f = () => setR(q.matches); q.addEventListener?.("change", f); return () => q.removeEventListener?.("change", f); }, []);
  return r;
}

/* ---------- Card (kiểu shadcn) ---------- */
export function Card({ className, ...p }) {
  return <section className={cn("rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]", className)} {...p} />;
}
export function CardHead({ title, right, sub, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5 pb-3", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {sub && <p className="mt-0.5 text-[13px] text-ink-3">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/* ---------- Button ---------- */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-medium transition-[background-color,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-shell text-shell-ink shadow-[0_1px_2px_oklch(0.3_0.05_168/0.3)] hover:bg-shell-2",
        brand: "bg-brand text-white hover:bg-brand-ink",
        outline: "border border-line bg-white text-ink hover:bg-wash",
        ghost: "text-ink-2 hover:bg-wash hover:text-ink",
        danger: "border border-err/30 bg-white text-err-ink hover:bg-err-soft",
      },
      size: { sm: "h-8 px-3 text-[13px]", md: "h-9 px-3.5 text-sm", icon: "size-9", iconSm: "size-8" },
    },
    defaultVariants: { variant: "outline", size: "md" },
  }
);
export function Button({ className, variant, size, ...p }) {
  return <button type="button" className={cn(buttonVariants({ variant, size }), className)} {...p} />;
}

/* ---------- Badge trạng thái ---------- */
export const TONE = {
  err: { dot: "bg-err", badge: "bg-err-soft text-err-ink", text: "text-err-ink" },
  warn: { dot: "bg-warn", badge: "bg-warn-soft text-warn-ink", text: "text-warn-ink" },
  ok: { dot: "bg-ok", badge: "bg-ok-soft text-ok-ink", text: "text-ok-ink" },
  run: { dot: "bg-run", badge: "bg-run-soft text-run-ink", text: "text-run-ink" },
  wait: { dot: "bg-wait", badge: "bg-wait-soft text-wait-ink", text: "text-wait-ink" },
  off: { dot: "bg-off", badge: "bg-off-soft text-ink-2", text: "text-ink-3" },
  gold: { dot: "bg-gold", badge: "bg-gold-soft text-gold-ink", text: "text-gold-ink" },
  info: { dot: "bg-run", badge: "bg-run-soft text-run-ink", text: "text-run-ink" },
};
export function Badge({ tone = "off", className, children, dot }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-medium whitespace-nowrap", TONE[tone].badge, className)}>
      {dot && <span className={cn("size-1.5 rounded-full", TONE[tone].dot)} />}
      {children}
    </span>
  );
}
export function Dot({ tone, pulse, className }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", TONE[tone].dot, pulse && "pulse-dot", className)} aria-hidden="true" />;
}

/* ---------- Số chạy khi mở trang ---------- */
export function CountUp({ to, dur = 900, format = (n) => Math.round(n).toLocaleString("vi-VN"), className }) {
  const reduced = useReducedMotion();
  const [v, setV] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced) { setV(to); return; }
    let raf, t0;
    const step = (t) => { if (!t0) t0 = t; const k = Math.min(1, (t - t0) / dur); setV(to * (1 - Math.pow(1 - k, 4))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, reduced]);
  return <span className={cn("tnum", className)}>{format(v)}</span>;
}

/* ---------- Vòng tiến độ ---------- */
export function Ring({ pct, size = 44, stroke = 5, tone = "gold", label = true }) {
  const [shown, setShown] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(pct)); return () => cancelAnimationFrame(id); }, [pct]);
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, shown));
  const col = { gold: "var(--color-gold-deep)", ok: "var(--color-ok)", err: "var(--color-err)", off: "var(--color-off)" }[tone];
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`Tiến độ ${Math.round(pct)}%`}>
      {label && size < 44 && <span className="tnum absolute text-[10.5px] font-semibold text-ink">{Math.round(pct)}</span>}
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line-2)" strokeWidth={stroke} />
        <circle className="ring-arc" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} />
      </svg>
      {label && size >= 44 && <span className="tnum absolute text-[11px] font-semibold text-ink">{Math.round(pct)}<span className="text-[9px] text-ink-3">%</span></span>}
    </span>
  );
}

/* ---------- Thanh vàng ---------- */
export function GoldBar({ pct, tone = "gold", className }) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(pct)); return () => cancelAnimationFrame(id); }, [pct]);
  const bg = { gold: "bg-[linear-gradient(90deg,var(--color-gold),var(--color-gold-deep))]", ok: "bg-ok", err: "bg-err", run: "bg-run" }[tone];
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-line-2", className)}>
      <div className={cn("bar-fill h-full rounded-full", bg)} style={{ width: `${Math.min(100, w)}%` }} />
    </div>
  );
}

/* ---------- Vạch 100 trận (signature phụ) ---------- */
export function MatchMeter({ n, tone = "run" }) {
  const col = { run: "bg-run", wait: "bg-wait", off: "bg-off" }[tone];
  return (
    <div className="flex h-3 gap-[1.5px]" role="img" aria-label={`${n} trên 100 trận hôm nay`}>
      {Array.from({ length: 50 }, (_, i) => (
        <span key={i} className={cn("flex-1 rounded-[1px]", i * 2 < n ? col : "bg-line-2", (i + 1) % 5 === 0 && "mr-[1.5px]")} />
      ))}
    </div>
  );
}

/* ---------- Nút chép ---------- */
export function CopyBtn({ text, className }) {
  const [ok, setOk] = useState(false);
  const t = useRef();
  const go = (e) => {
    e.stopPropagation();
    const done = () => { setOk(true); clearTimeout(t.current); t.current = setTimeout(() => setOk(false), 1400); };
    try { navigator.clipboard.writeText(text).then(done, done); } catch { done(); }
  };
  return (
    <button type="button" onClick={go} aria-label={ok ? "Đã chép" : `Chép tên đơn ${text}`} title={ok ? "Đã chép" : "Chép tên đơn"}
      className={cn("inline-grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-wash hover:text-ink cursor-pointer", ok && "text-ok-ink", className)}>
      {ok ? <Check className="size-4" /> : <Copy className="size-4" />}
    </button>
  );
}

/* ---------- Segmented (lọc) ---------- */
export function Segmented({ items, value, onChange, className, label }) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex flex-wrap gap-1 rounded-2xl bg-wash p-1", className)}>
      {items.map((it) => (
        <button key={it.k} role="tab" aria-selected={value === it.k} type="button" onClick={() => onChange(it.k)}
          className={cn("inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium transition-colors cursor-pointer",
            value === it.k ? "bg-white text-ink shadow-[0_1px_3px_oklch(0.3_0.04_168/0.15)]" : "text-ink-2 hover:text-ink")}>
          {it.dot && <Dot tone={it.dot} className="size-2" />}
          {it.l}
          {it.c != null && <span className={cn("tnum rounded-full px-1.5 text-[11.5px]", it.ct ? TONE[it.ct].badge : "bg-line-2 text-ink-2")}>{it.c}</span>}
        </button>
      ))}
    </div>
  );
}

export function SampleTag({ className }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-1 text-[12px] font-semibold text-gold-ink", className)}><span className="size-1.5 rounded-full bg-gold-deep" />Dữ liệu mẫu</span>;
}

/* ---------- icon vàng + kim cương (vẽ theo phong cách icon 2D trong game) ---------- */
export function Coin({ className }) {
  const dots = Array.from({ length: 8 }, (_, i) => { const t = (i * Math.PI) / 4 - Math.PI / 2; return [12 + 8.9 * Math.cos(t), 12 + 8.9 * Math.sin(t)]; });
  const pent = (r, rot = -90) => Array.from({ length: 5 }, (_, i) => { const t = ((rot + i * 72) * Math.PI) / 180; return `${(12 + r * Math.cos(t)).toFixed(2)},${(12 + r * Math.sin(t)).toFixed(2)}`; }).join(" ");
  const patches = Array.from({ length: 5 }, (_, i) => { const t = ((-54 + i * 72) * Math.PI) / 180; return [12 + 5.6 * Math.cos(t), 12 + 5.6 * Math.sin(t), -54 + i * 72]; });
  return (
    <svg viewBox="0 0 24 24" className={cn("inline-block size-[1.1em] shrink-0 align-[-0.2em]", className)} aria-hidden="true">
      <defs>
        <radialGradient id="cn-o" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stopColor="#F9DE78" /><stop offset="0.7" stopColor="#E8B93A" /><stop offset="1" stopColor="#D49B1E" /></radialGradient>
        <clipPath id="cn-c"><circle cx="12" cy="12" r="5.9" /></clipPath>
      </defs>
      <circle cx="12" cy="12" r="11.2" fill="url(#cn-o)" stroke="#C8901A" strokeWidth="0.7" />
      <circle cx="12" cy="12" r="10.1" fill="none" stroke="#FBE7A0" strokeWidth="0.6" opacity="0.8" />
      {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.8" fill="#FFF0AE" />)}
      <circle cx="12" cy="12" r="6.6" fill="#EBC04A" stroke="#FFF0AE" strokeWidth="1.1" />
      <g clipPath="url(#cn-c)" fill="#FFF0AE">
        <polygon points={pent(2.3)} />
        {patches.map(([x, y, rot], i) => <polygon key={i} points={Array.from({ length: 5 }, (_, k) => { const t = ((rot + 180 + k * 72) * Math.PI) / 180; return `${(x + 1.9 * Math.cos(t)).toFixed(2)},${(y + 1.9 * Math.sin(t)).toFixed(2)}`; }).join(" ")} />)}
      </g>
    </svg>
  );
}
export function Gem({ className }) {
  return (
    <svg viewBox="0 0 24 22" className={cn("inline-block size-[1.1em] shrink-0 align-[-0.2em]", className)} aria-hidden="true">
      <polygon points="6,2.5 18,2.5 16,7.6 8,7.6" fill="#E8F8FF" />
      <polygon points="1.6,8 6,2.5 8,7.6" fill="#C3E8F8" />
      <polygon points="22.4,8 18,2.5 16,7.6" fill="#A6D8EF" />
      <polygon points="1.6,8 8,7.6 12,20.5" fill="#A9DAF0" />
      <polygon points="8,7.6 16,7.6 12,20.5" fill="#CDEEFB" />
      <polygon points="16,7.6 22.4,8 12,20.5" fill="#8FCAE6" />
      <polygon points="6,2.5 18,2.5 22.4,8 12,20.5 1.6,8" fill="none" stroke="#7DB8D6" strokeWidth="0.7" strokeLinejoin="round" />
      <polygon points="7.2,3.4 10.5,3.4 9.4,5.2" fill="#FFFFFF" opacity="0.85" />
    </svg>
  );
}
/* thanh tiền kiểu HUD trong game */
export function Hud({ kind = "gold", n, size = "md", className }) {
  const gold = kind === "gold";
  return (
    <span className={cn("relative inline-flex items-center rounded-full font-extrabold tnum whitespace-nowrap",
      size === "lg" ? "h-10 pr-4 pl-10 text-[19px]" : "h-7 pr-2.5 pl-7 text-[13.5px]", className)}
      style={{
        background: gold ? "linear-gradient(180deg,#FFE27A 0%,#FFC21F 55%,#F5A100 100%)" : "linear-gradient(180deg,#8EE0FF 0%,#3DB8F5 55%,#1C93E3 100%)",
        color: gold ? "#3A2400" : "#06213A",
        boxShadow: `inset 0 1.5px 0 rgba(255,255,255,.65), inset 0 -2px 0 ${gold ? "rgba(170,90,0,.35)" : "rgba(10,70,140,.35)"}, 0 0 0 1.5px ${gold ? "#D88A00" : "#1278C2"}, 0 3px 8px -3px ${gold ? "rgba(200,120,0,.55)" : "rgba(20,110,200,.5)"}`,
      }}>
      <span className={cn("absolute top-1/2 -translate-y-1/2 drop-shadow-[0_1px_1px_rgba(0,0,0,.25)]", size === "lg" ? "-left-1.5 text-[34px]" : "-left-1 text-[24px]")}>{gold ? <Coin className="size-[1em]" /> : <Gem className="size-[1em]" />}</span>
      {Number(n).toLocaleString("vi-VN")}<span className="sr-only">{gold ? " vàng" : " kim cương"}</span>
    </span>
  );
}
export function HudPill({ kind, n, size = "md", dark = size === "lg", className }) {
  const gold = kind === "coin" || kind === "gold";
  const col = dark ? (gold ? "text-[#F8D57A]" : "text-[#9EE3FF]") : gold ? "text-gold-ink" : "text-gem-ink";
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-extrabold tnum whitespace-nowrap", size === "lg" ? "text-[24px] tracking-[-0.01em]" : "text-[15px]", col, className)}>
      {Number(n).toLocaleString("vi-VN")}
      {gold ? <Coin className="size-[1.05em]" /> : <Gem className="size-[1.05em]" />}
      <span className="sr-only">{gold ? " vàng" : " kim cương"}</span>
    </span>
  );
}

/* số + icon, có chữ ẩn cho trình đọc màn hình */
export function Gold({ n, className, strong = true }) {
  return <span className={cn("inline-flex items-center gap-1 tnum whitespace-nowrap", className)}><span className={strong ? "font-semibold" : ""}>{Number(n).toLocaleString("vi-VN")}</span><Coin /><span className="sr-only"> vàng</span></span>;
}
export function Gems({ n, className, strong = true }) {
  return <span className={cn("inline-flex items-center gap-1 tnum whitespace-nowrap", className)}><span className={strong ? "font-semibold" : ""}>{Number(n).toLocaleString("vi-VN")}</span><Gem /><span className="sr-only"> kim cương</span></span>;
}

/* ---------- nút đổi màu menu (demo) ---------- */
export const SHELLS = [
  { k: "sky", l: "Xanh dương nhạt", sw: "linear-gradient(135deg,oklch(0.95 0.035 220),oklch(0.82 0.1 245))" },
  { k: "ocean", l: "Xanh trời đậm", sw: "linear-gradient(135deg,oklch(0.66 0.14 225),oklch(0.5 0.17 255))" },
  { k: "aurora", l: "Xanh dương → tím", sw: "linear-gradient(135deg,oklch(0.93 0.05 215),oklch(0.85 0.09 300))" },
  { k: "mint", l: "Xanh ngọc", sw: "linear-gradient(135deg,oklch(0.96 0.035 175),oklch(0.84 0.09 195))" },
  { k: "pitch", l: "Xanh sân cỏ (cũ)", sw: "linear-gradient(135deg,oklch(0.36 0.06 168),oklch(0.26 0.05 168))" },
];
export function ShellPicker({ value, onChange, className, dark }) {
  return (
    <div className={className}>
      <div className={cn("mb-1.5 text-[12px] font-medium", dark ? "text-[var(--sh-mute)]" : "text-ink-3")}>Màu menu</div>
      <div role="radiogroup" aria-label="Màu menu" className="flex flex-wrap gap-1.5">
        {SHELLS.map((s) => (
          <button key={s.k} type="button" role="radio" aria-checked={value === s.k} aria-label={s.l} title={s.l} onClick={() => onChange(s.k)}
            className={cn("size-6 cursor-pointer rounded-full ring-1 ring-black/10 transition-transform hover:scale-110", value === s.k && "ring-2 ring-offset-2 ring-[var(--sh-solid)] ring-offset-white/80")}
            style={{ background: s.sw }} />
        ))}
      </div>
      <div className={cn("mt-1 text-[12px]", dark ? "text-[var(--sh-mute)]" : "text-ink-3")}>{SHELLS.find((s) => s.k === value)?.l}</div>
    </div>
  );
}

/* ---------- chọn bộ màu khung sản lượng + hàng ngày thuê (demo để chốt) ---------- */
export const ACCS = [
  { k: "slate", l: "Xanh xám", sw: ["#8B9BC4", "#556185", "#16333A"] },
  { k: "violet", l: "Tím", sw: ["#64338A", "#341A57", "#1A1222"] },
];
export function AccPicker({ value, onChange, dark, className }) {
  return (
    <div className={className}>
      <div className={cn("mb-1.5 text-[12px] font-medium", dark ? "text-[var(--sh-mute)]" : "text-ink-3")}>Màu khung + hàng ngày</div>
      <div role="radiogroup" aria-label="Màu khung sản lượng và hàng ngày thuê" className="flex gap-1.5">
        {ACCS.map((a) => (
          <button key={a.k} type="button" role="radio" aria-checked={value === a.k} onClick={() => onChange(a.k)}
            className={cn("flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 text-[12.5px] font-medium transition-colors",
              value === a.k ? "border-[var(--sh-solid)] bg-white text-ink shadow-[0_1px_3px_oklch(0.3_0.04_250/0.15)]" : "border-transparent bg-white/50 text-ink-2 hover:bg-white")}>
            <span className="flex overflow-hidden rounded-[4px]">{a.sw.map((c) => <span key={c} className="h-4 w-2" style={{ background: c }} />)}</span>
            {a.l}
          </button>
        ))}
      </div>
    </div>
  );
}
