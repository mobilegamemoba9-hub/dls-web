import { useState, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, ClipboardCopy, Check, ChevronDown, CircleCheck } from "lucide-react";
import { Card, CardHead, Badge, Button, Segmented, CountUp, useReducedMotion, cn } from "../ui.jsx";
import { months, daysOct, partnerDay, debts, isUsd, inkOn, fmt, todayDDMM } from "../data.js";
import { Chip } from "./Don.jsx";

const SERIES = [
  { k: "ngl", l: "NGL", c: "var(--color-s-ngl)", note: "trả đô, đã quy ra VNĐ" },
  { k: "iml", l: "IML", c: "var(--color-s-iml)", note: "Ismoilov, tiền Việt" },
  { k: "vn", l: "Khách VN", c: "var(--color-s-vn)", note: "tiền Việt" },
];
const tr = (n) => (n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(".", ",").replace(/,?0+$/, (m) => (m.startsWith(",") ? "" : m));

export default function DoanhThu({ rate, setRate, prices, setPrices }) {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState("month");
  const [rateTxt, setRateTxt] = useState(fmt(rate));
  const [copied, setCopied] = useState(false);

  const mData = useMemo(() => months.map((m) => ({ x: m.m, ngl: (m.usd * rate) / 1e6, iml: m.iml, vn: m.vn, usd: m.usd })), [rate]);
  const dData = useMemo(() => daysOct.map((d) => ({ x: String(d.d), ngl: (d.usd * rate) / 1e6, iml: d.iml, vn: d.vn, usd: d.usd })), [rate]);
  const data = mode === "month" ? mData : dData;
  const total = (r) => r.ngl + r.iml + r.vn;
  const last = mData[mData.length - 1], prev = mData[mData.length - 2];
  const sumAll = mData.reduce((a, r) => a + total(r), 0);
  const sumSeries = (k) => data.reduce((a, r) => a + r[k], 0);

  const commitRate = () => { const n = parseInt(rateTxt.replace(/\D/g, "")); if (n > 1000) { setRate(n); setRateTxt(fmt(n)); } else setRateTxt(fmt(rate)); };
  const copyPartner = () => {
    const t = partnerDay.map((p) => `${p.n}: ${p.v} (${p.s})`).join("\n");
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1400); };
    try { navigator.clipboard.writeText(t).then(done, done); } catch { done(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">Doanh thu</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">Tự cộng từ trang Đơn. Tiền đô quy ra VNĐ theo tỉ giá bên phải.</p>
        </div>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[14px] shadow-[var(--shadow-card)] focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15">
          <span className="text-ink-2">1$ =</span>
          <input value={rateTxt} onChange={(e) => setRateTxt(e.target.value)} onBlur={commitRate} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} inputMode="numeric" aria-label="Tỉ giá đô la"
            className="tnum w-[72px] bg-transparent text-right font-semibold focus:outline-none" />
          <span className="text-ink-2">đ</span>
        </label>
      </div>

      {/* biểu đồ */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div>
            <div className="text-[13px] text-ink-3">{mode === "month" ? "Tháng 10" : "Cả tháng 10, chia theo ngày"}</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-[32px] leading-none font-bold tracking-[-0.025em] text-ink"><CountUp to={total(last)} format={(n) => tr(n)} /></span>
              <span className="text-[15px] font-semibold text-ink-2">triệu</span>
            </div>
            <div className="mt-1.5 text-[13px] text-ink-2 tnum">gồm {String(last.usd).replace(".", ",")}$ · {(() => { const d = Math.round((total(last) / total(prev) - 1) * 100); return d < 0 ? `giảm ${-d}%` : `tăng ${d}%`; })()} so với T9 · 5 tháng: {tr(sumAll)} triệu</div>
          </div>
          <Segmented label="Kiểu xem" value={mode} onChange={setMode} items={[{ k: "month", l: "Theo tháng" }, { k: "day", l: "Theo ngày" }]} />
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 px-5 sm:px-6">
          {SERIES.map((s) => (
            <div key={s.k} className="flex items-center gap-2 text-[13px]">
              <span className="size-2.5 rounded-[3px]" style={{ background: s.c }} />
              <span className="font-semibold">{s.l}</span>
              <span className="tnum text-ink-2">{tr(sumSeries(s.k))} tr</span>
              <span className="hidden text-ink-3 sm:inline">· {s.note}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 h-[280px] px-1 pb-3 sm:h-[320px] sm:px-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 12, left: -8, bottom: 0 }} barCategoryGap={mode === "month" ? "28%" : "18%"}>
              <CartesianGrid vertical={false} stroke="var(--color-line-2)" />
              <XAxis dataKey="x" tickLine={false} axisLine={false} tick={{ fill: "var(--color-ink-3)", fontSize: 12 }} interval={mode === "day" ? "preserveStartEnd" : 0} minTickGap={8} />
              <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: "var(--color-ink-3)", fontSize: 12 }} tickFormatter={(v) => (v === 0 ? "0" : `${v}tr`)} />
              <Tooltip cursor={{ fill: "oklch(0.5 0.04 168 / 0.06)" }} content={<Tip mode={mode} />} />
              {SERIES.map((s, i) => (
                <Bar key={s.k} dataKey={s.k} stackId="a" fill={s.c} radius={i === 2 ? [6, 6, 0, 0] : [0, 0, 0, 0]} isAnimationActive={!reduced} animationDuration={900} animationEasing="ease-out" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <DebtSection rate={rate} />

      <DayCard />

      <PriceList prices={prices} setPrices={setPrices} />
    </div>
  );
}

function Tip({ active, payload, label, mode }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload, t = r.ngl + r.iml + r.vn;
  return (
    <div className="glass min-w-[180px] rounded-xl border border-white/80 px-3.5 py-2.5 text-[13px] shadow-[var(--shadow-float)]">
      <div className="font-semibold">{mode === "month" ? `Tháng ${label.slice(1)}` : `Ngày ${label}/10`}</div>
      {[...SERIES].reverse().map((s) => (
        <div key={s.k} className="mt-1 flex items-center gap-2"><span className="size-2 rounded-[2px]" style={{ background: s.c }} /><span className="text-ink-2">{s.l}</span><span className="tnum ml-auto font-medium">{tr(r[s.k])} tr</span></div>
      ))}
      <div className="mt-1.5 flex justify-between border-t border-ink/10 pt-1.5 font-semibold"><span>Tổng</span><span className="tnum">{tr(t)} tr</span></div>
      {r.usd > 0 && <div className="mt-0.5 text-[12px] text-ink-3 tnum">gồm {String(r.usd).replace(".", ",")}$</div>}
    </div>
  );
}

function PriceList({ prices, setPrices }) {
  const upd = (id, patch) => setPrices((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const del = (id) => setPrices((ps) => ps.filter((p) => p.id !== id));
  const add = (usd) => setPrices((ps) => [...ps, { id: Date.now(), v: usd ? "0$" : "0đ", bg: "#E9ECF0", fg: "#3F4A5A", d: null }]);
  const group = (usd) => (
    <div>
      <div className="mb-2 flex items-center justify-between"><span className="text-[13px] font-medium text-ink-3">{usd ? "Đô la" : "Tiền Việt"}</span><Button size="sm" variant="ghost" onClick={() => add(usd)}><Plus />Thêm giá</Button></div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {prices.filter((p) => isUsd(p.v) === usd).map((p) => (
          <li key={p.id} className="group flex items-center gap-2 rounded-xl border border-line-2 bg-wash/40 p-1.5 pr-1">
            <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-ink/10" style={{ background: p.bg }} title="Đổi màu">
              <input type="color" value={p.bg} onChange={(e) => upd(p.id, { bg: e.target.value, fg: inkOn(e.target.value) })} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`Màu của ${p.v}`} />
            </label>
            <PriceInput p={p} onSave={(v) => upd(p.id, { v })} />
            <DaysInput p={p} onSave={(d) => upd(p.id, { d })} />
            <button type="button" onClick={() => del(p.id)} aria-label={`Xoá giá ${p.v}`} className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-3 opacity-60 hover:bg-err-soft hover:text-err-ink group-hover:opacity-100 cursor-pointer"><Trash2 className="size-3.5" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <Card>
      <CardHead title="Danh sách giá chọn nhanh" sub="Dùng cho ô Doanh thu ở trang Đơn. Sửa số, bấm ô màu để đổi màu. Ô “ngày” = số ngày cày của giá đó: Đến hạn = Ngày thuê + số ngày (giống Sheet); để trống = không tính hạn." />
      <div className="grid gap-6 border-t border-line-2 px-5 py-5 lg:grid-cols-2">
        {group(false)}
        {group(true)}
      </div>
    </Card>
  );
}
function DaysInput({ p, onSave }) {
  const [v, setV] = useState(p.d == null ? "" : String(p.d));
  const save = () => { const t = v.trim(); const n = t === "" ? null : Math.max(0, Math.min(999, parseInt(t, 10))); if (t !== "" && !Number.isFinite(n)) { setV(p.d == null ? "" : String(p.d)); return; } if (n !== p.d) onSave(n); setV(n == null ? "" : String(n)); };
  return (
    <label className="flex h-7 shrink-0 items-center gap-1 rounded-lg border border-line bg-white px-1.5 text-[12px] text-ink-3 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/20" title="Số ngày cày của giá này">
      <input value={v} inputMode="numeric" onChange={(e) => setV(e.target.value.replace(/[^0-9]/g, ""))} onBlur={save} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} placeholder="—" aria-label={`Số ngày của giá ${p.v}`} className="tnum w-7 bg-transparent text-right text-[13px] font-semibold text-ink focus:outline-none" />
      ngày
    </label>
  );
}
function PriceInput({ p, onSave }) {
  const [v, setV] = useState(p.v);
  return <input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v.trim() && v !== p.v && onSave(v.trim())} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} aria-label="Giá"
    style={{ background: p.bg, color: p.fg }}
    className="tnum h-7 min-w-0 flex-1 rounded-lg border border-transparent px-2.5 text-[13px] font-semibold hover:border-ink/20 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20" />;
}

/* ---------- chép + xem trước nội dung ---------- */
function CopyBox({ text, label = "Chép bảng" }) {
  const [show, setShow] = useState(false);
  const [ok, setOk] = useState(false);
  const pre = useRef();
  const copy = () => {
    const done = () => { setOk(true); setTimeout(() => setOk(false), 1500); };
    const fallback = () => { setShow(true); setTimeout(() => { const r = document.createRange(); if (pre.current) { r.selectNodeContents(pre.current); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } }, 30); };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch { fallback(); }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={copy} className="flex-1">{ok ? <><Check className="text-ok-ink" />Đã chép</> : <><ClipboardCopy />{label}</>}</Button>
        <Button variant="ghost" onClick={() => setShow((v) => !v)} aria-expanded={show}>{show ? "Ẩn" : "Xem nội dung sẽ chép"}<ChevronDown className={cn("transition-transform", show && "rotate-180")} /></Button>
      </div>
      {show && <pre ref={pre} className="mt-2 overflow-x-auto rounded-xl border border-line-2 bg-wash px-3.5 py-3 font-mono text-[12.5px] leading-relaxed whitespace-pre text-ink">{text}</pre>}
    </div>
  );
}

/* ---------- công nợ theo kỳ ---------- */
const money = (cur, n) => (cur === "usd" ? `${String(+n.toFixed(2)).replace(".", ",")}$` : `${fmt(n)}đ`);
const moneyEn = (cur, n) => (cur === "usd" ? `${+n.toFixed(2)}$` : `${fmt(n)} VND`);

function DebtSection({ rate }) {
  return (
    <section aria-labelledby="cn-h" className="space-y-3">
      <div>
        <h2 id="cn-h" className="text-[19px] font-bold tracking-[-0.01em]">Công nợ đối tác</h2>
        <p className="mt-1 max-w-[70ch] text-[13.5px] text-ink-2">Tính theo <b>kỳ</b>: kỳ mở từ ngày sau lần đối tác thanh toán gần nhất đến hôm nay. Mỗi đơn của đối tác đã nhập giá ở trang Đơn được cộng vào kỳ đang mở. Khi bạn chốt tiền và đối tác chuyển xong, bấm <b>Đánh dấu đã thanh toán</b> để đóng kỳ, kỳ mới tự bắt đầu.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">{debts.map((d) => <DebtCard key={d.n} d={d} rate={rate} />)}</div>
    </section>
  );
}
function DebtCard({ d, rate }) {
  const [hist, setHist] = useState(d.history);
  const [orders, setOrders] = useState(d.orders);
  const [from, setFrom] = useState(d.from);
  const [confirm, setConfirm] = useState(false);
  const total = orders.reduce((a, [, v]) => a + v, 0);
  const text = [
    `${d.n} - orders ${from} to ${todayDDMM()}/${new Date().getFullYear()}`,
    ...orders.map(([n, v], i) => `${i + 1}. ${n}  ${moneyEn(d.cur, v)}`),
    `Total: ${orders.length} orders = ${moneyEn(d.cur, total)}`,
  ].join("\n");
  const markPaid = () => {
    if (!confirm) { setConfirm(true); return; }
    setHist((h) => [{ k: `${from} → ${todayDDMM()}`, n: orders.length, amt: total, paid: todayDDMM() }, ...h]);
    setOrders([]); setFrom("05/11"); setConfirm(false);
  };
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h3 className="text-[16px] font-semibold">{d.n}</h3>
          <p className="mt-0.5 text-[13px] text-ink-3">Kỳ đang mở: <span className="tnum font-medium text-ink-2">{from} → hôm nay</span> · {d.cur === "usd" ? "tính bằng đô" : "tính bằng tiền Việt"}</p>
        </div>
        {orders.length ? <Badge tone="warn" dot>Chưa thanh toán</Badge> : <Badge tone="ok" dot>Đã thanh toán</Badge>}
      </div>
      <div className="px-5 pt-3">
        <div className="text-[12.5px] text-ink-3">Phải thu kỳ này</div>
        <div className="flex flex-wrap items-baseline gap-x-2"><span className="tnum text-[28px] leading-tight font-bold tracking-[-0.02em] text-gold-ink">{money(d.cur, total)}</span>
          <span className="tnum text-[13px] text-ink-2">{orders.length} đơn{d.cur === "usd" && total > 0 && <> · ≈ {fmt(Math.round(total * rate))}đ</>}</span></div>
        {d.skipped && orders.length > 0 && <p className="mt-1 text-[12.5px] text-warn-ink">{d.skipped}</p>}
      </div>
      {orders.length > 0 && (
        <ul className="mx-5 mt-3 divide-y divide-line-2 rounded-xl border border-line-2">
          {orders.map(([n, v]) => <li key={n} className="flex items-center justify-between gap-3 px-3 py-1.5 text-[13px]"><span className="truncate">{n}</span><span className="tnum font-semibold">{money(d.cur, v)}</span></li>)}
        </ul>
      )}
      <div className="space-y-2 px-5 pt-4">
        {orders.length > 0 && <CopyBox text={text} label="Chép bảng gửi đối tác" />}
        {orders.length > 0 && (
          <Button variant={confirm ? "default" : "outline"} className="w-full" onClick={markPaid} onBlur={() => setConfirm(false)}>
            <CircleCheck />{confirm ? `Bấm lần nữa: xác nhận đã nhận ${money(d.cur, total)}` : "Đánh dấu đã thanh toán"}
          </Button>
        )}
      </div>
      <div className="mt-4 border-t border-line-2 px-5 py-3.5">
        <div className="mb-1.5 text-[12.5px] font-medium text-ink-3">Các kỳ đã thanh toán</div>
        <ul className="space-y-1 text-[13px]">
          {hist.map((h) => (
            <li key={h.k} className="flex flex-wrap items-center gap-x-2 tnum">
              <Badge tone="ok" className="px-2 py-0 text-[11.5px]">Đã trả {h.paid}</Badge>
              <span className="text-ink-2">{h.k}</span><span className="text-ink-3">· {h.n} đơn</span>
              <span className="ml-auto font-semibold">{money(d.cur, h.amt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/* ---------- tiền đối tác 1 ngày (để bạn tự xem) ---------- */
function DayCard() {
  const text = ["Tiền đối tác ngày 19/10/2026", ...partnerDay.map((p) => `- ${p.n}: ${p.v}${p.vnd ? ` (= ${p.vnd})` : ""}, ${p.s}${p.warn ? `, ${p.warn}` : ""}`)].join("\n");
  return (
    <Card>
      <CardHead title="Tiền đối tác theo ngày" sub="Xem nhanh 1 ngày có bao nhiêu tiền từ mỗi nguồn. Bảng này để bạn tự xem, không phải bảng gửi đối tác."
        right={<input type="date" defaultValue="2026-10-19" aria-label="Chọn ngày" className="tnum h-8 rounded-lg border border-line bg-white px-2 text-[13px] focus:border-brand focus:outline-none" />} />
      <ul className="grid divide-line-2 border-t border-line-2 sm:grid-cols-3 sm:divide-x max-sm:divide-y">
        {partnerDay.map((p) => (
          <li key={p.n} className="px-5 py-3.5">
            <div className="font-semibold">{p.n}</div>
            <div className="tnum mt-0.5 text-[20px] font-bold text-gold-ink">{p.v}{p.vnd && <span className="ml-1.5 text-[13px] font-medium text-ink-3">= {p.vnd}</span>}</div>
            <div className="text-[13px] text-ink-3">{p.s}</div>
            {p.warn && <div className="text-[12.5px] font-medium text-warn-ink">{p.warn}</div>}
          </li>
        ))}
      </ul>
      <div className="border-t border-line-2 px-5 py-4"><CopyBox text={text} label="Chép tóm tắt ngày" /></div>
    </Card>
  );
}
