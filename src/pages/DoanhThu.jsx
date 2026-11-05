import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, ClipboardCopy, Check, ChevronDown, CircleCheck } from "lucide-react";
import { Card, CardHead, Badge, Button, Segmented, CountUp, useReducedMotion, cn } from "../ui.jsx";
import { isUsd, inkOn, fmt } from "../data.js";
import { money as tien, ymd } from "../store.js";
import { Chip } from "./Don.jsx";

const SERIES = [
  { k: "ngl", l: "NGL", c: "var(--color-s-ngl)", note: "trả đô, đã quy ra VNĐ" },
  { k: "iml", l: "IML", c: "var(--color-s-iml)", note: "Ismoilov, tiền Việt" },
  { k: "vn", l: "Khách VN", c: "var(--color-s-vn)", note: "tiền Việt" },
];
const KEY = { NGL: "ngl", IML: "iml", "Khách VN": "vn" };
const tr = (n) => (n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(".", ",").replace(/,?0+$/, (m) => (m.startsWith(",") ? "" : m));
const usdTxt = (n) => String(+n.toFixed(2)).replace(".", ",");

// cộng doanh thu theo tháng / ngày từ giá bạn nhập ở trang Đơn
function useSums(orders, rate) {
  return useMemo(() => {
    const m = {}, d = {};
    const add = (box, key, x) => {
      const r = (box[key] ??= { ngl: 0, iml: 0, vn: 0, usd: 0, n: 0 });
      const t = tien(x.rev);
      r[KEY[x.kenh] || "vn"] += (t.vnd + t.usd * rate) / 1e6;
      r.usd += t.usd; r.n++;
    };
    for (const x of orders) if (x.rev && x.st !== "bo") { add(m, x.day.slice(0, 7), x); add(d, x.day, x); }
    return { m, d };
  }, [orders, rate]);
}

export default function DoanhThu({ rate, setRate, prices, setPrices, orders = [], data, onSave }) {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState("month");
  const [rateTxt, setRateTxt] = useState(fmt(rate));
  useEffect(() => setRateTxt(fmt(rate)), [rate]);
  const sums = useSums(orders, rate);
  const months = Object.keys(sums.m).sort();
  const [mon, setMon] = useState("");
  const cur = mon && months.includes(mon) ? mon : months.at(-1) || ymd(Date.now()).slice(0, 7);
  const mData = months.map((k) => ({ x: "T" + +k.slice(5), key: k, ...sums.m[k] }));
  const dData = useMemo(() => {
    const [y, mo] = cur.split("-").map(Number);
    const n = new Date(y, mo, 0).getDate();
    return Array.from({ length: n }, (_, i) => { const k = `${cur}-${String(i + 1).padStart(2, "0")}`; return { x: String(i + 1), key: k, ...(sums.d[k] || { ngl: 0, iml: 0, vn: 0, usd: 0, n: 0 }) }; });
  }, [cur, sums]);
  const data0 = mode === "month" ? mData : dData;
  const total = (r) => (r ? r.ngl + r.iml + r.vn : 0);
  const iCur = mData.findIndex((r) => r.key === cur);
  const last = mData[iCur], prev = mData[iCur - 1];
  const sumAll = mData.reduce((a, r) => a + total(r), 0);
  const sumSeries = (k) => data0.reduce((a, r) => a + r[k], 0);
  const chuaGia = orders.filter((x) => !x.rev && x.st !== "bo").length;

  const commitRate = () => { const n = parseInt(rateTxt.replace(/\D/g, "")); if (n > 1000) { if (n !== rate) setRate(n); setRateTxt(fmt(n)); } else setRateTxt(fmt(rate)); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">Doanh thu</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">Tự cộng từ giá bạn chọn ở trang Đơn. Tiền đô quy ra VNĐ theo tỉ giá bên phải.{chuaGia > 0 && <> <a href="#don" className="font-medium text-warn-ink underline-offset-4 hover:underline">{fmt(chuaGia)} đơn chưa nhập giá</a> chưa được tính.</>}</p>
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
        {!months.length ? (
          <p className="px-5 py-10 text-center text-[14px] text-ink-3">{data ? "Chưa có đơn nào có giá. Chọn giá ở trang Đơn (hoặc nhập đơn cũ từ Sheet) để thấy biểu đồ." : "Đang đọc dữ liệu…"}</p>
        ) : (<>
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div>
            <div className="text-[13px] text-ink-3">{mode === "month" ? `Tháng ${+cur.slice(5)}/${cur.slice(0, 4)}` : `Tháng ${+cur.slice(5)}, chia theo ngày`}</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-[32px] leading-none font-bold tracking-[-0.025em] text-ink"><CountUp to={total(last)} format={(n) => tr(n)} /></span>
              <span className="text-[15px] font-semibold text-ink-2">triệu</span>
            </div>
            <div className="mt-1.5 text-[13px] text-ink-2 tnum">{last && last.usd > 0 ? `gồm ${usdTxt(last.usd)}$ · ` : ""}{last ? `${fmt(last.n)} đơn có giá` : ""}{prev && total(prev) > 0 ? (() => { const d = Math.round((total(last) / total(prev) - 1) * 100); return ` · ${d < 0 ? `giảm ${-d}%` : `tăng ${d}%`} so với T${+prev.key.slice(5)}`; })() : ""} · {months.length} tháng: {tr(sumAll)} triệu</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {months.length > 1 && (
              <select aria-label="Chọn tháng" value={cur} onChange={(e) => setMon(e.target.value)} className="h-9 cursor-pointer rounded-xl border border-line bg-white px-3 text-[14px] focus:border-brand focus:outline-none">
                {[...months].reverse().map((k) => <option key={k} value={k}>Tháng {+k.slice(5)}/{k.slice(0, 4)}</option>)}
              </select>
            )}
            <Segmented label="Kiểu xem" value={mode} onChange={setMode} items={[{ k: "month", l: "Theo tháng" }, { k: "day", l: "Theo ngày" }]} />
          </div>
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
            <BarChart data={data0} margin={{ top: 16, right: 12, left: -8, bottom: 0 }} barCategoryGap={mode === "month" ? "28%" : "18%"}>
              <CartesianGrid vertical={false} stroke="var(--color-line-2)" />
              <XAxis dataKey="x" tickLine={false} axisLine={false} tick={{ fill: "var(--color-ink-3)", fontSize: 12 }} interval={mode === "day" ? "preserveStartEnd" : 0} minTickGap={8} />
              <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: "var(--color-ink-3)", fontSize: 12 }} tickFormatter={(v) => (v === 0 ? "0" : `${tr(v)}tr`)} />
              <Tooltip cursor={{ fill: "oklch(0.5 0.04 168 / 0.06)" }} content={<Tip mode={mode} mon={cur} />} />
              {SERIES.map((s, i) => (
                <Bar key={s.k} dataKey={s.k} stackId="a" fill={s.c} radius={i === 2 ? [6, 6, 0, 0] : [0, 0, 0, 0]} isAnimationActive={!reduced} animationDuration={900} animationEasing="ease-out" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        </>)}
      </Card>

      <DebtSection rate={rate} orders={orders} congNo={(data && data.web && data.web.cong_no) || {}} onSave={onSave} />

      <DayCard orders={orders} rate={rate} />

      <PriceList prices={prices} setPrices={setPrices} />
    </div>
  );
}

function Tip({ active, payload, label, mode, mon }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload, t = r.ngl + r.iml + r.vn;
  return (
    <div className="glass min-w-[180px] rounded-xl border border-white/80 px-3.5 py-2.5 text-[13px] shadow-[var(--shadow-float)]">
      <div className="font-semibold">{mode === "month" ? `Tháng ${label.slice(1)}` : `Ngày ${label}/${+mon.slice(5)}`}</div>
      {[...SERIES].reverse().map((s) => (
        <div key={s.k} className="mt-1 flex items-center gap-2"><span className="size-2 rounded-[2px]" style={{ background: s.c }} /><span className="text-ink-2">{s.l}</span><span className="tnum ml-auto font-medium">{tr(r[s.k])} tr</span></div>
      ))}
      <div className="mt-1.5 flex justify-between border-t border-ink/10 pt-1.5 font-semibold"><span>Tổng</span><span className="tnum">{tr(t)} tr</span></div>
      {r.usd > 0 && <div className="mt-0.5 text-[12px] text-ink-3 tnum">gồm {usdTxt(r.usd)}$</div>}
      <div className="mt-0.5 text-[12px] text-ink-3 tnum">{r.n} đơn có giá</div>
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

/* ---------- công nợ theo kỳ (lưu /web/cong_no/<ngl|iml>: tu = ngày bắt đầu kỳ đang mở, ls = các kỳ đã trả) ---------- */
const money = (cur, n) => (cur === "usd" ? `${usdTxt(n)}$` : `${fmt(n)}đ`);
const moneyEn = (cur, n) => (cur === "usd" ? `${+n.toFixed(2)}$` : `${fmt(n)} VND`);
const DOI_TAC = [{ k: "ngl", n: "Nextgen DLS", kenh: "NGL", cur: "usd" }, { k: "iml", n: "Ismoilov", kenh: "IML", cur: "vnd" }];
const d2 = (d) => (d ? d.split("-").reverse().join("/") : "");
const addDay = (d, n) => { const t = new Date(d + "T00:00:00"); t.setDate(t.getDate() + n); return ymd(t.getTime()); };

function DebtSection({ rate, orders, congNo, onSave }) {
  return (
    <section aria-labelledby="cn-h" className="space-y-3">
      <div>
        <h2 id="cn-h" className="text-[19px] font-bold tracking-[-0.01em]">Công nợ đối tác</h2>
        <p className="mt-1 max-w-[70ch] text-[13.5px] text-ink-2">Tính theo <b>kỳ</b>: từ ngày bắt đầu kỳ đến hôm nay. Mỗi đơn của đối tác đã có giá ở trang Đơn được cộng vào kỳ đang mở. Khi đối tác chuyển tiền xong, bấm <b>Đánh dấu đã thanh toán</b> để đóng kỳ, kỳ mới tự bắt đầu từ ngày mai.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">{DOI_TAC.map((d) => <DebtCard key={d.k} d={d} rate={rate} orders={orders} cn={congNo[d.k] || {}} onSave={onSave} />)}</div>
    </section>
  );
}
function DebtCard({ d, rate, orders, cn, onSave }) {
  const today = ymd(Date.now());
  const from = cn.tu || addDay(today, -6);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const inKy = orders.filter((x) => x.st !== "bo" && x.kenh === d.kenh && x.src !== "Tay" && x.day >= from && x.day <= today);
  const priced = inKy.filter((x) => x.rev).map((x) => { const t = tien(x.rev); return [x.name, d.cur === "usd" ? t.usd + t.vnd / rate : t.vnd + t.usd * rate]; });
  const miss = inKy.length - priced.length;
  const total = priced.reduce((a, [, v]) => a + v, 0);
  const hist = Object.entries(cn.ls || {}).map(([id, h]) => ({ id, ...h })).sort((a, b) => (a.den < b.den ? 1 : -1));
  const text = [
    `${d.n} - orders ${d2(from)} to ${d2(today)}`,
    ...priced.map(([n, v], i) => `${i + 1}. ${n}  ${moneyEn(d.cur, v)}`),
    `Total: ${priced.length} orders = ${moneyEn(d.cur, total)}`,
  ].join("\n");
  const markPaid = async () => {
    if (!confirm) { setConfirm(true); return; }
    setBusy(true);
    try {
      await onSave({ [`cong_no/${d.k}/ls/k${Date.now()}`]: { tu: from, den: today, n: priced.length, amt: +total.toFixed(2), paid: today }, [`cong_no/${d.k}/tu`]: addDay(today, 1) });
      setConfirm(false);
    } catch { /* lỗi đã hiện ở đầu trang */ } finally { setBusy(false); }
  };
  const setFrom = (v) => { if (/^\d{4}-\d{2}-\d{2}$/.test(v)) onSave({ [`cong_no/${d.k}/tu`]: v }).catch(() => {}); };
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold">{d.n}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-3">Kỳ đang mở từ
            <input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} aria-label={`Ngày bắt đầu kỳ ${d.n}`} className="tnum h-7 rounded-lg border border-line bg-white px-1.5 text-[13px] text-ink-2 focus:border-brand focus:outline-none" />
            → hôm nay · {d.cur === "usd" ? "tính bằng đô" : "tính bằng tiền Việt"}</p>
          {!cn.tu && <p className="mt-0.5 text-[12px] text-warn-ink">Chưa đặt ngày bắt đầu kỳ: đang tạm tính 7 ngày gần nhất. Chọn đúng ngày sau lần đối tác trả gần nhất.</p>}
        </div>
        {priced.length ? <Badge tone="warn" dot>Chưa thanh toán</Badge> : <Badge tone="ok" dot>Không nợ</Badge>}
      </div>
      <div className="px-5 pt-3">
        <div className="text-[12.5px] text-ink-3">Phải thu kỳ này</div>
        <div className="flex flex-wrap items-baseline gap-x-2"><span className="tnum text-[28px] leading-tight font-bold tracking-[-0.02em] text-gold-ink">{money(d.cur, total)}</span>
          <span className="tnum text-[13px] text-ink-2">{priced.length} đơn{d.cur === "usd" && total > 0 && <> · ≈ {fmt(Math.round(total * rate))}đ</>}</span></div>
        {miss > 0 && <p className="mt-1 text-[12.5px] text-warn-ink">{miss} đơn trong kỳ chưa nhập giá, chưa tính.</p>}
      </div>
      {priced.length > 0 && (
        <ul className="mx-5 mt-3 max-h-[260px] divide-y divide-line-2 overflow-y-auto rounded-xl border border-line-2">
          {priced.map(([n, v], i) => <li key={n + i} className="flex items-center justify-between gap-3 px-3 py-1.5 text-[13px]"><span className="truncate">{n}</span><span className="tnum font-semibold">{money(d.cur, v)}</span></li>)}
        </ul>
      )}
      <div className="space-y-2 px-5 pt-4">
        {priced.length > 0 && <CopyBox text={text} label="Chép bảng gửi đối tác" />}
        {priced.length > 0 && (
          <Button variant={confirm ? "default" : "outline"} className="w-full" onClick={markPaid} onBlur={() => setConfirm(false)} disabled={busy}>
            <CircleCheck />{busy ? "Đang lưu…" : confirm ? `Bấm lần nữa: xác nhận đã nhận ${money(d.cur, total)}` : "Đánh dấu đã thanh toán"}
          </Button>
        )}
      </div>
      <div className="mt-4 border-t border-line-2 px-5 py-3.5">
        <div className="mb-1.5 text-[12.5px] font-medium text-ink-3">Các kỳ đã thanh toán</div>
        {!hist.length && <p className="text-[13px] text-ink-3">Chưa có kỳ nào được đánh dấu trên web.</p>}
        <ul className="space-y-1 text-[13px]">
          {hist.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-x-2 tnum">
              <Badge tone="ok" className="px-2 py-0 text-[11.5px]">Đã trả {d2(h.paid).slice(0, 5)}</Badge>
              <span className="text-ink-2">{d2(h.tu).slice(0, 5)} → {d2(h.den).slice(0, 5)}</span><span className="text-ink-3">· {h.n} đơn</span>
              <span className="ml-auto font-semibold">{money(d.cur, +h.amt || 0)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/* ---------- tiền đối tác 1 ngày (để bạn tự xem) ---------- */
function DayCard({ orders, rate }) {
  const [day, setDay] = useState(ymd(Date.now()));
  const rows = [{ n: "Nextgen DLS", kenh: "NGL", cur: "usd" }, { n: "Ismoilov", kenh: "IML", cur: "vnd" }, { n: "Khách Việt Nam", kenh: "Khách VN", cur: "vnd" }].map((p) => {
    const os = orders.filter((x) => x.st !== "bo" && x.day === day && x.kenh === p.kenh);
    const s = os.reduce((a, x) => { const t = tien(x.rev); a.usd += t.usd; a.vnd += t.vnd; return a; }, { usd: 0, vnd: 0 });
    const miss = os.filter((x) => !x.rev).length;
    const v = p.cur === "usd" ? `${usdTxt(s.usd)}$` + (s.vnd ? ` + ${fmt(s.vnd)}đ` : "") : `${fmt(s.vnd)}đ` + (s.usd ? ` + ${usdTxt(s.usd)}$` : "");
    const vnd = p.cur === "usd" && s.usd ? `${fmt(Math.round(s.usd * rate + s.vnd))}đ` : "";
    const names = os.map((x) => x.name.split(".")[0]);
    return { ...p, v, vnd, s: os.length ? `${os.length} đơn${p.kenh !== "Khách VN" && names.length ? ` ${names[0]}${names.length > 1 ? " → " + names.at(-1) : ""}` : ""}` : "Không có đơn", warn: miss ? `${miss} đơn chưa nhập giá` : "" };
  });
  const text = [`Tiền đối tác ngày ${d2(day)}`, ...rows.map((p) => `- ${p.n}: ${p.v}${p.vnd ? ` (= ${p.vnd})` : ""}, ${p.s}${p.warn ? `, ${p.warn}` : ""}`)].join("\n");
  return (
    <Card>
      <CardHead title="Tiền đối tác theo ngày" sub="Xem nhanh 1 ngày có bao nhiêu tiền từ mỗi nguồn. Bảng này để bạn tự xem, không phải bảng gửi đối tác."
        right={<input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Chọn ngày" className="tnum h-8 rounded-lg border border-line bg-white px-2 text-[13px] focus:border-brand focus:outline-none" />} />
      <ul className="grid divide-line-2 border-t border-line-2 sm:grid-cols-3 sm:divide-x max-sm:divide-y">
        {rows.map((p) => (
          <li key={p.n} className="min-w-0 px-5 py-3.5">
            <div className="font-semibold">{p.n}</div>
            <div className="tnum mt-0.5 text-[20px] font-bold break-words text-gold-ink">{p.v}{p.vnd && <span className="ml-1.5 text-[13px] font-medium text-ink-3">= {p.vnd}</span>}</div>
            <div className="text-[13px] text-ink-3">{p.s}</div>
            {p.warn && <div className="text-[12.5px] font-medium text-warn-ink">{p.warn}</div>}
          </li>
        ))}
      </ul>
      <div className="border-t border-line-2 px-5 py-4"><CopyBox text={text} label="Chép tóm tắt ngày" /></div>
    </Card>
  );
}
