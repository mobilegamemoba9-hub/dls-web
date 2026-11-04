import { useState, useRef, useEffect } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Plus, Search, ArrowDownToLine, X, ChevronDown } from "lucide-react";
import { Badge, CopyBtn, Button, Segmented, GoldBar, Coin, cn } from "../ui.jsx";
import { isUsd, fmt, curOf, tinhHan, todayDDMM } from "../data.js";

const SRC_TONE = { NGL: "bg-[oklch(0.95_0.03_272)] text-s-ngl", IML: "bg-[oklch(0.95_0.035_192)] text-[oklch(0.45_0.09_192)]", "Khách VN": "bg-gold-soft text-gold-ink", Tay: "bg-off-soft text-ink-2" };
const STATUS = { cay: { l: "Đang cày", tone: "run" }, xong: { l: "Đã xong", tone: "ok" }, ban: { l: "Acc bị khóa", tone: "err" } };
const dk = (d) => { const [a, b] = d.split("/"); return +b * 100 + +a; };
const TODAY = todayDDMM();

export default function Don({ orders: raw, setOrders, prices }) {
  const orders = raw.map((o) => ({ ...o, ...tinhHan(o, prices) }));
  const [tab, setTab] = useState("all");
  const [src, setSrc] = useState("all");
  const [closed, setClosed] = useState(() => new Set([...new Set(orders.map((x) => x.start))].filter((d) => orders.filter((x) => x.start === d).every((x) => x.st === "xong"))));
  const toggle = (d) => setClosed((c) => { const n = new Set(c); n.has(d) ? n.delete(d) : n.add(d); return n; });
  const [q, setQ] = useState("");
  const [srt, setSrt] = useState("asc");
  const [flash, setFlash] = useState(null);
  const endRef = useRef();

  const C = {
    cay: orders.filter((x) => x.st === "cay").length,
    late: orders.filter((x) => x.ls === "late").length,
    miss: orders.filter((x) => !x.rev).length,
    xong: orders.filter((x) => x.st === "xong").length,
    ban: orders.filter((x) => x.st === "ban").length,
  };
  const match = { all: () => true, cay: (x) => x.st === "cay", late: (x) => x.ls === "late", miss: (x) => !x.rev, xong: (x) => x.st === "xong", ban: (x) => x.st === "ban" };
  let list = orders.filter((x) => (src === "all" || x.src === src) && (!q || x.name.toLowerCase().includes(q.toLowerCase())) && match[tab](x));
  const dueK = (x) => (x.dueT == null ? Infinity : x.dueT);
  const groups = [...new Set(list.map((x) => x.start))].sort((a, b) => (srt === "desc" ? dk(b) - dk(a) : dk(a) - dk(b)))
    .map((d) => { let os = list.filter((x) => x.start === d); if (srt === "due") os = [...os].sort((a, b) => dueK(a) - dueK(b)); return { d, os }; });

  const update = (id, patch) => setOrders((os) => os.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const add = (o) => { setOrders((os) => [...os, o]); setTab("all"); setSrc("all"); setClosed((c) => { const n = new Set(c); n.delete(o.start); return n; }); setQ(""); setSrt("asc"); setFlash(o.id); setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">Đơn hàng</h1>
          <p className="mt-1 text-[13.5px] text-ink-2 tnum">2.166 đơn · <span className="text-run-ink font-medium">94 đang cày</span> · <span className="text-ok-ink font-medium">2.052 xong</span> · <span className="text-err-ink font-medium">20 acc bị khóa</span></p>
        </div>
        <AddOrder onAdd={add} />
      </div>

      {/* bộ lọc */}
      <div className="space-y-3 rounded-[var(--radius-card)] border border-line bg-white p-3 shadow-[var(--shadow-card)]">
        <Segmented label="Lọc đơn" value={tab} onChange={setTab}
          items={[
            { k: "all", l: "Tất cả" },
            { k: "cay", l: "Đang cày", c: C.cay },
            { k: "late", l: "Quá hạn", c: C.late, ct: "err" },
            { k: "miss", l: "Chưa nhập giá", c: C.miss, ct: "warn" },
            { k: "xong", l: "Đã xong", c: C.xong },
            { k: "ban", l: "Acc bị khóa", c: C.ban },
          ]} />
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[200px] flex-1">
            <span className="sr-only">Tìm đơn</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên đơn hoặc code"
              className="h-9 w-full rounded-xl border border-line bg-white pr-3 pl-9 text-[14px] placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15" />
          </label>
          <Select value={src} onChange={setSrc} label="Nguồn đơn" opts={[["all", "Mọi nguồn"], ["NGL", "NGL"], ["IML", "IML"], ["Khách VN", "Khách VN"], ["Tay", "Đơn tay"]]} />
          <Select value={srt} onChange={setSrt} label="Sắp xếp" opts={[["asc", "Cũ trước"], ["desc", "Mới trước"], ["due", "Gần hạn trước"]]} />
        </div>
      </div>

      {/* bảng (máy tính) */}
      <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)] min-[1400px]:block">
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-wash/70 text-left text-[12.5px] font-medium text-ink-3">
                {["Đơn · nguồn · máy", "Tiến độ", "Đến hạn", "Còn lại", "Ghi chú", "Doanh thu", "Tình trạng"].map((h) => <th key={h} className="px-2.5 py-2.5 font-medium whitespace-nowrap first:pl-5 last:pr-5">{h}</th>)}
              </tr>
            </thead>
            {groups.map(({ d, os }) => (
              <tbody key={d} className="divide-y divide-line-2 border-t border-line">
                <tr className="border-y border-[var(--day-line)] bg-[var(--day-bg)]"><td colSpan={7} className="px-5 py-2"><GroupHead d={d} os={os} open={!closed.has(d)} onToggle={() => toggle(d)} /></td></tr>
                {!closed.has(d) && os.map((x) => (
                <tr key={x.id} ref={x.id === flash ? endRef : undefined} className={cn("transition-colors hover:bg-wash/50", x.id === flash && "bg-gold-soft/70")}>
                  <td className="py-2.5 pr-2 pl-5">
                    <div className="flex items-center"><span className="max-w-[260px] truncate font-medium" title={x.name}>{x.name}</span><CopyBtn text={x.name} className="size-7" /></div>
                    <div className="mt-0.5 flex items-center gap-2"><Src s={x.src} /><span className="tnum text-[12.5px] text-ink-3">{x.m} · tab {x.tab}</span></div>
                  </td>
                  <td className="px-2.5"><Progress x={x} /></td>
                  <td className="px-2.5 tnum whitespace-nowrap font-medium">{x.due}</td>
                  <td className="px-2.5 whitespace-nowrap"><Left x={x} /></td>
                  <td className="px-2.5"><Note x={x} update={update} /></td>
                  <td className="px-2.5"><PricePicker value={x.rev} cur={curOf(x.src)} src={x.src} prices={prices} onPick={(v) => update(x.id, { rev: v })} /></td>
                  <td className="py-2.5 pr-5 pl-2.5"><Badge tone={STATUS[x.st].tone} dot>{STATUS[x.st].l}</Badge></td>
                </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>

      </div>

      {/* thẻ (điện thoại, máy nhỏ) */}
      <div className="space-y-4 min-[1400px]:hidden">
        {groups.map(({ d, os }) => (
          <section key={d} aria-label={`Ngày thuê ${d}`}>
            <div className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-10 rounded-2xl border border-[var(--day-line)] bg-[var(--day-bg)] px-4 py-2.5 backdrop-blur-md lg:top-2"><GroupHead d={d} os={os} open={!closed.has(d)} onToggle={() => toggle(d)} /></div>
            {!closed.has(d) && (
            <ul className="mt-3 grid gap-3 lg:grid-cols-2">
              {os.map((x) => (
                <li key={x.id} ref={x.id === flash ? endRef : undefined} className={cn("rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-card)]", x.id === flash && "ring-2 ring-gold")}>
            <div className="flex items-start gap-1"><span className="min-w-0 flex-1 text-[14.5px] leading-snug font-semibold break-all">{x.name}</span><CopyBtn text={x.name} className="-mt-1 -mr-1" /></div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><Src s={x.src} /><span className="tnum text-[12.5px] text-ink-3">{x.m} · tab {x.tab}</span><Badge tone={STATUS[x.st].tone} dot className="ml-auto">{STATUS[x.st].l}</Badge></div>
            <div className="mt-3"><Progress x={x} wide /></div>
            <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-wash/70 px-3 py-2 text-[13px]">
              <div><dt className="text-ink-3">Đến hạn</dt><dd className="tnum font-medium">{x.due}</dd></div>
              <div><dt className="text-ink-3">Còn lại</dt><dd><Left x={x} /></dd></div>
            </dl>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[12.5px] text-ink-3">Doanh thu</span>
              <PricePicker value={x.rev} cur={curOf(x.src)} src={x.src} prices={prices} onPick={(v) => update(x.id, { rev: v })} />
            </div>
            <div className="mt-2.5"><Note x={x} update={update} wide /></div>
          </li>
              ))}
            </ul>
            )}
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
        <span className="tnum">Đang hiện {list.length} đơn mẫu trong {groups.length} ngày. Ngày đã xong hết đơn tự thu gọn, bấm tiêu đề ngày để mở.</span>
        {!list.length && <Empty />}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { setClosed(new Set()); const rows = document.querySelectorAll(innerWidth >= 1400 ? "tbody tr" : "main section li"); rows[rows.length - 1]?.scrollIntoView({ behavior: "smooth", block: "center" }); }}><ArrowDownToLine />Xuống đơn mới nhất</Button>
      </div>
    </div>
  );
}

const barTone = (x) => (x.g >= x.tg ? "ok" : x.ls === "late" ? "err" : "gold");
function Progress({ x, wide }) {
  const p = Math.min(100, (x.g / x.tg) * 100);
  return (
    <div className={wide ? "" : "w-[148px]"}>
      <div className="flex items-center gap-1 whitespace-nowrap tnum text-[12.5px]">
        <span className="font-semibold text-ink">{fmt(x.g)}</span><span className="text-ink-3">/ {fmt(x.tg)}</span><Coin /><span className="sr-only">vàng</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <GoldBar pct={p} tone={x.st === "ban" ? "run" : barTone(x)} className="h-1 flex-1" />
        <span className={cn("tnum w-9 text-right text-[12px] font-semibold", p >= 100 ? "text-ok-ink" : x.ls === "late" ? "text-err-ink" : "text-gold-ink")}>{Math.round(p)}%</span>
      </div>
    </div>
  );
}
const parseRev = (os) => os.reduce((a, x) => { if (!x.rev) return a; if (isUsd(x.rev)) a.usd += parseFloat(x.rev); else a.vnd += parseInt(x.rev.replace(/\D/g, "")) || 0; return a; }, { vnd: 0, usd: 0 });
function GroupHead({ d, os, open, onToggle }) {
  const priced = os.filter((x) => x.rev).length;
  const r = parseRev(os);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <button type="button" onClick={onToggle} aria-expanded={open} className="inline-flex cursor-pointer items-center gap-1.5 text-[14px] font-extrabold tracking-[0.02em] text-[var(--day-ink)] uppercase">
        <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />Ngày thuê: {d}/2026{d === TODAY && <span className="ml-1 rounded-full bg-[#F5C542] px-2 py-0.5 text-[11px] text-[#2A1E00] normal-case">Hôm nay</span>}
      </button>
      <span className="tnum ml-auto text-[13px] font-semibold text-[var(--day-money)]">{[r.vnd > 0 && `${fmt(r.vnd)}đ`, r.usd > 0 && `${String(+r.usd.toFixed(2)).replace(".", ",")}$`].filter(Boolean).join(" + ") || (priced ? "0đ" : "Chưa có doanh thu")}</span>
    </div>
  );
}
function Left({ x }) {
  const c = x.ls === "late" ? "text-err-ink font-semibold" : x.ls === "done" ? "text-ok-ink font-medium" : x.ls === "ban" ? "text-err-ink font-medium" : x.ls === "none" ? "text-ink-3" : "font-medium";
  return <span className={cn("tnum", c)}>{x.left}</span>;
}
function Src({ s }) { return <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap", SRC_TONE[s])}>{s}</span>; }
function Empty() { return <p className="px-4 py-10 text-center text-[14px] text-ink-3">Không có đơn nào khớp bộ lọc. Thử chọn "Tất cả", "Mọi ngày thuê" hoặc xoá ô tìm.</p>; }

function Select({ value, onChange, opts, label, className }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
      className={cn("h-9 cursor-pointer rounded-xl border border-line bg-white bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235b6b66%22 stroke-width=%222.2%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[position:right_10px_center] bg-no-repeat pr-8 pl-3 text-[14px] appearance-none focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15", className)}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function Note({ x, update, wide }) {
  const [v, setV] = useState(x.note);
  useEffect(() => setV(x.note), [x.note]);
  return (
    <input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== x.note && update(x.id, { note: v })} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      placeholder="Thêm ghi chú" aria-label={`Ghi chú đơn ${x.name}`}
      className={cn("h-8 rounded-lg border border-transparent bg-transparent px-2 text-[13px] text-ink placeholder:text-ink-3/80 hover:border-line focus:border-brand focus:bg-white focus:outline-none focus:ring-3 focus:ring-brand/15", wide ? "w-full border-line-2 bg-wash/50" : "w-[112px]")} />
  );
}

/* ---------- ô giá: bấm mở bảng chip màu ---------- */
export function Chip({ p, children, className, ...rest }) {
  return <span className={cn("inline-flex h-7 items-center rounded-lg px-2.5 text-[12.5px] font-semibold whitespace-nowrap tnum", className)} style={p ? { background: p.bg, color: p.fg } : undefined} {...rest}>{children}</span>;
}
function PricePicker({ value, prices, onPick, cur = "both", src }) {
  const [open, setOpen] = useState(false);
  const [other, setOther] = useState("");
  const p = prices.find((x) => x.v === value);
  const pick = (v) => { onPick(v); setOpen(false); setOther(""); };
  const useOther = () => {
    let v = other.trim(); if (!v) return;
    const usd = cur === "usd" || (cur === "both" && isUsd(v));
    v = usd ? `${v.replace(/[$\s]/g, "").replace(",", ".")}$` : fmt(parseInt(v.replace(/\D/g, "")) || 0) + "đ";
    pick(v);
  };
  const group = (usd) => (
    <>
      <div className="mt-3 text-[12px] font-medium text-ink-3">{usd ? "Đô la" : "Tiền Việt"}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{prices.filter((x) => isUsd(x.v) === usd).map((x) => <button key={x.id} type="button" onClick={() => pick(x.v)} className={cn("cursor-pointer rounded-lg transition-transform hover:scale-[1.04]", x.v === value && "ring-2 ring-ink/70 ring-offset-1")}><Chip p={x}>{x.v}</Chip></button>)}</div>
    </>
  );
  const note = cur === "usd" ? `Đơn ${src} tính bằng đô la` : cur === "vnd" ? `Đơn ${src} tính bằng tiền Việt` : "Đơn tay: chọn tiền Việt hoặc đô";
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" aria-label={`Doanh thu: ${value || "chưa nhập"}. Bấm để chọn`} className="cursor-pointer rounded-lg transition-transform hover:-translate-y-px focus-visible:outline-2">
          {value ? <Chip p={p || { bg: "#E9ECF0", fg: "#3F4A5A" }}>{value}</Chip>
            : <Chip className="border border-dashed border-warn/60 bg-warn-soft text-warn-ink">Chọn giá</Chip>}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={8} collisionPadding={12} align="start"
          className="glass pop-in z-50 max-h-[var(--radix-popover-content-available-height)] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-white/80 p-4 shadow-[var(--shadow-float)]">
          <div className="flex items-center justify-between"><span className="text-[14px] font-semibold">Doanh thu</span><Popover.Close className="grid size-7 cursor-pointer place-items-center rounded-lg text-ink-3 hover:bg-white" aria-label="Đóng"><X className="size-4" /></Popover.Close></div>
          <div className="mt-0.5 text-[12.5px] text-ink-2">{note}</div>
          {cur !== "usd" && group(false)}
          {cur !== "vnd" && group(true)}
          <div className="mt-3.5 flex gap-2">
            <input value={other} onChange={(e) => setOther(e.target.value)} onKeyDown={(e) => e.key === "Enter" && useOther()} aria-label="Số khác"
              placeholder={cur === "usd" ? "Số khác, vd 2.4" : cur === "vnd" ? "Số khác, vd 120000" : "Số khác: 120000 hoặc 2.4$"}
              className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-[13.5px] placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15" />
            <Button size="md" variant="default" onClick={useOther}>Dùng</Button>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <Button size="sm" variant="ghost" className="text-err-ink" onClick={() => pick("")} disabled={!value}>Xoá giá</Button>
            <a href="#doanh-thu" className="text-[13px] font-medium text-brand-ink hover:underline underline-offset-4">Sửa danh sách giá</a>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ---------- thêm đơn tay ---------- */
function AddOrder({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [pre, setPre] = useState("GL.");
  const [name, setName] = useState("");
  const [where, setWhere] = useState("M10 · 5");
  const [err, setErr] = useState("");
  const submit = () => {
    const n = name.trim();
    if (!n) { setErr("Nhập tên đơn, ví dụ NGL236.150K.04/11"); return; }
    const [m, tab] = where.split("·").map((s) => s.trim());
    const tg = (parseInt((n.match(/(\d+)K/i) || [])[1]) || 0) * 1000 || 100000;
    const full = `${pre}${n}`;
    onAdd({ id: full + Date.now(), name: full, src: "Tay", m: m || "M10", tab: tab || "—", g: 0, tg, start: TODAY, note: pre === "KICK" ? "Đơn KICK đưa lại" : "", rev: "", st: "cay" });
    setName(""); setErr(""); setOpen(false);
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild><Button variant="default"><Plus />Thêm đơn tay</Button></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={8} align="end" collisionPadding={12} className="glass pop-in z-50 max-h-[var(--radix-popover-content-available-height)] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-white/80 p-4 shadow-[var(--shadow-float)]">
          <div className="text-[14px] font-semibold">Thêm đơn tay</div>
          <div className="mt-3"><Segmented label="Loại đơn" value={pre} onChange={setPre} items={[{ k: "GL.", l: "GL." }, { k: "KICK", l: "KICK" }]} className="w-fit" /></div>
          <label className="mt-3 block text-[12.5px] font-medium text-ink-2">Tên đơn
            <div className="mt-1 flex h-9 items-center rounded-xl border border-line bg-white pl-3 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15">
              <span className="text-[13.5px] font-semibold text-ink-3">{pre}</span>
              <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="NGL236.150K.04/11" className="h-full min-w-0 flex-1 bg-transparent px-1 text-[13.5px] text-ink focus:outline-none" />
            </div>
          </label>
          {err && <p className="mt-1.5 text-[12.5px] text-err-ink">{err}</p>}
          <label className="mt-3 block text-[12.5px] font-medium text-ink-2">Máy · tab
            <input value={where} onChange={(e) => setWhere(e.target.value)} className="mt-1 h-9 w-full rounded-xl border border-line bg-white px-3 text-[13.5px] text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15" />
          </label>
          <Button variant="default" className="mt-4 w-full" onClick={submit}>Thêm vào cuối danh sách</Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
