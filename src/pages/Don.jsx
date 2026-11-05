import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Plus, Search, ArrowDownToLine, X, ChevronDown, Upload, FileUp, Check, CheckCheck, Trash2, RotateCcw } from "lucide-react";
import { Badge, CopyBtn, Button, Segmented, GoldBar, Coin, cn } from "../ui.jsx";
import { isUsd, fmt, curOf, tinhHan } from "../data.js";
import { ymd } from "../store.js";
import { docSheet, keHoachNhap } from "../nhap.js";

const SRC_TONE = { NGL: "bg-[oklch(0.95_0.03_272)] text-s-ngl", IML: "bg-[oklch(0.95_0.035_192)] text-[oklch(0.45_0.09_192)]", "Khách VN": "bg-gold-soft text-gold-ink", Tay: "bg-off-soft text-ink-2" };
const STATUS = {
  cay: { l: "Đang cày", tone: "run" }, xong: { l: "Đã xong", tone: "ok" }, ban: { l: "Acc bị khóa", tone: "err" },
  dung: { l: "Đã dừng", tone: "warn" }, noi: { l: "Đang nối code", tone: "wait" }, kiem: { l: "Cần kiểm tay", tone: "err" },
};
const XONG = ["xong", "ban", "dung"];
const DAY = 86400000;
// ngày đến hạn chọn tay (sua/<id>/han = "YYYY-MM-DD") thay cho công thức giá
function hanTay(o, h) {
  if (!o.han) return h;
  const t = new Date(o.han + "T00:00:00").getTime();
  if (!Number.isFinite(t)) return h;
  const [y, m, d] = o.han.split("-");
  const r = { ...h, dueT: t, due: `${d}/${m}` };
  if (["xong", "ban", "dung", "noi", "kiem"].includes(o.st)) return r;
  const now = new Date(); const n = Math.round((t - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / DAY);
  return { ...r, left: n < 0 ? `Trễ ${-n} ngày` : n === 0 ? "Hôm nay" : `${n} ngày`, ls: n < 0 ? "late" : "ok" };
}
const TODAY = ymd(Date.now());
const ddmm = (day) => { const [, m, d] = day.split("-"); return `${d}/${m}`; };

function useWide() {
  const q = "(min-width: 1400px)";
  const [w, setW] = useState(() => typeof matchMedia !== "undefined" && matchMedia(q).matches);
  useEffect(() => { const m = matchMedia(q); const f = () => setW(m.matches); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  return w;
}

export default function Don({ orders: raw, prices, onSave, ready, reporting }) {
  const orders = useMemo(() => raw.map((o) => {
    const h = hanTay(o, tinhHan(o, prices));
    if (o.st === "dung") return { ...o, ...h, left: "Đã dừng", ls: "none" };
    if (o.st === "noi" || o.st === "kiem") return { ...o, ...h, left: STATUS[o.st].l, ls: o.st === "kiem" ? "late" : "none" };
    return { ...o, ...h };
  }), [raw, prices]);
  const [tab, setTab] = useState("all");
  const [src, setSrc] = useState("all");
  const [open, setOpen] = useState({});                         // ngày -> true/false do bạn bấm (mặc định: ngày xong hết thì thu gọn)
  const [q, setQ] = useState("");
  const [srt, setSrt] = useState("asc");
  const [flash, setFlash] = useState(null);
  const endRef = useRef();

  const C = {
    cay: orders.filter((x) => x.st === "cay").length,
    late: orders.filter((x) => x.ls === "late").length,
    miss: orders.filter((x) => canGia(x)).length,
    xong: orders.filter((x) => x.st === "xong").length,
    ban: orders.filter((x) => x.st === "ban").length,
    kiem: orders.filter((x) => x.st === "kiem" || x.st === "noi").length,
    ngoai: orders.filter((x) => x.ngoaiSheet && !x.xoa).length,
    xoa: orders.filter((x) => x.xoa).length,
  };
  const tt = { all: () => true, ngoai: (x) => x.ngoaiSheet, cay: (x) => x.st === "cay", late: (x) => x.ls === "late", miss: canGia, xong: (x) => x.st === "xong", ban: (x) => x.st === "ban", kiem: (x) => x.st === "kiem" || x.st === "noi" };
  const match = { ...Object.fromEntries(Object.entries(tt).map(([k, f]) => [k, (x) => !x.xoa && f(x)])), xoa: (x) => x.xoa };
  const ql = q.trim().toLowerCase();
  const list = orders.filter((x) => (src === "all" || x.src === src) && (!ql || x.name.toLowerCase().includes(ql)) && match[tab](x));
  const dueK = (x) => (x.dueT == null ? Infinity : x.dueT);
  const days = [...new Set(list.map((x) => x.day))].sort((a, b) => (srt === "desc" ? (a < b ? 1 : -1) : a < b ? -1 : 1));
  const groups = days.map((d) => { let os = list.filter((x) => x.day === d); if (srt === "due") os = [...os].sort((a, b) => dueK(a) - dueK(b)); return { d, os }; });
  const moc = ymd(Date.now() - 10 * 86400000);                // mặc định chỉ mở 10 ngày gần nhất (ngày cũ hơn bấm để mở) -> lướt nhẹ
  const isOpen = (d, os) => (d in open ? open[d] : !!ql || (tab !== "all" ? true : d >= moc && !os.every((x) => XONG.includes(x.st))));
  const toggle = (d, os) => setOpen((c) => ({ ...c, [d]: !isOpen(d, os) }));

  const update = (id, patch) => onSave(Object.fromEntries(Object.entries(patch).map(([k, v]) => [`sua/${id}/${k}`, v === "" ? null : v])));
  const saveRef = useRef(update); saveRef.current = update;
  const upd = useCallback((id, patch) => saveRef.current(id, patch), []);          // hàm cố định -> các dòng không vẽ lại khi không đổi
  const wide = useWide();
  // đánh dấu xong cả ngày: chỉ đơn Đang cày, KHÔNG thấy trên máy, và (đã tới/qua hạn HOẶC máy của đơn có gửi dữ liệu mà không có đơn này)
  const bulkOf = (os) => os.filter((x) => canXong(x) && ((x.dueT != null && x.dueT <= Date.now()) || (x.m && reporting && reporting.has(x.m))));
  const bulkXong = (os) => onSave(Object.fromEntries(os.map((x) => [`sua/${x.id}/st`, "xong"]))).catch(() => {});
  const add = async (o) => {
    await onSave({ [`don_tay/${o.id}`]: o.v });
    setTab("all"); setSrc("all"); setOpen((c) => ({ ...c, [o.v.day]: true })); setQ(""); setSrt("asc"); setFlash(o.id);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  };
  const coCu = orders.some((x) => x.from === "cu");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">Đơn hàng</h1>
          <p className="mt-1 text-[13.5px] text-ink-2 tnum">{fmt(orders.length - C.xoa)} đơn · <span className="text-run-ink font-medium">{fmt(C.cay)} đang cày</span> · <span className="text-ok-ink font-medium">{fmt(C.xong)} xong</span> · <span className="text-err-ink font-medium">{fmt(C.ban)} acc bị khóa</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ready && <ImportOld orders={raw} onSave={onSave} again={coCu} />}
          <AddOrder onAdd={add} />
        </div>
      </div>

      {/* bộ lọc */}
      <div className="space-y-3 rounded-[var(--radius-card)] border border-line bg-white p-3 shadow-[var(--shadow-card)]">
        <Segmented label="Lọc đơn" value={tab} onChange={setTab}
          items={[
            { k: "all", l: "Tất cả" },
            { k: "cay", l: "Đang cày", c: C.cay },
            { k: "late", l: "Quá hạn", c: C.late, ct: "err" },
            { k: "miss", l: "Chưa nhập giá", c: C.miss, ct: "warn" },
            ...(C.kiem ? [{ k: "kiem", l: "Đang nối code", c: C.kiem }] : []),
            { k: "xong", l: "Đã xong", c: C.xong },
            { k: "ban", l: "Acc bị khóa", c: C.ban },
            ...(C.ngoai ? [{ k: "ngoai", l: "Không có trong Sheet", c: C.ngoai, ct: "warn" }] : []),
            ...(C.xoa ? [{ k: "xoa", l: "Đã xóa", c: C.xoa }] : []),
          ]} />
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[200px] flex-1">
            <span className="sr-only">Tìm đơn</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên đơn"
              className="h-9 w-full rounded-xl border border-line bg-white pr-3 pl-9 text-[14px] placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15" />
          </label>
          <Select value={src} onChange={setSrc} label="Nguồn đơn" opts={[["all", "Mọi nguồn"], ["NGL", "NGL"], ["IML", "IML"], ["Khách VN", "Khách VN"], ["Tay", "Đơn tay"]]} />
          <Select value={srt} onChange={setSrt} label="Sắp xếp" opts={[["asc", "Cũ trước"], ["desc", "Mới trước"], ["due", "Gần hạn trước"]]} />
        </div>
      </div>

      {!ready && <p className="rounded-2xl border border-dashed border-line bg-white/60 px-4 py-8 text-center text-[14px] text-ink-3">Đang đọc đơn…</p>}

      {/* CHỈ vẽ 1 kiểu: bảng (máy tính >= 1400px) hoặc thẻ (điện thoại) -> nhẹ hơn nhiều khi lướt */}
      {groups.length > 0 && wide && (
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-wash/70 text-left text-[12.5px] font-medium text-ink-3">
                {["Đơn · nguồn · máy", "Tiến độ", "Đến hạn", "Còn lại", "Ghi chú", "Doanh thu", "Tình trạng"].map((h) => <th key={h} className="px-2.5 py-2.5 font-medium whitespace-nowrap first:pl-5 last:pr-5">{h}</th>)}
              </tr>
            </thead>
            {groups.map(({ d, os }) => (
              <tbody key={d} className="divide-y divide-line-2 border-t border-line">
                <tr className="border-y border-[var(--day-line)] bg-[var(--day-bg)]"><td colSpan={7} className="px-5 py-2"><GroupHead d={d} os={os} open={isOpen(d, os)} onToggle={() => toggle(d, os)} bulk={bulkOf(os)} onBulk={bulkXong} /></td></tr>
                {isOpen(d, os) && os.map((x) => <Row key={x.id} x={x} prices={prices} update={upd} flash={x.id === flash} rowRef={x.id === flash ? endRef : undefined} />)}
              </tbody>
            ))}
          </table>
        </div>
      </div>
      )}

      {groups.length > 0 && !wide && (
      <div className="space-y-4">
        {groups.map(({ d, os }) => (
          <section key={d} aria-label={`Ngày thuê ${ddmm(d)}`}>
            <div className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-10 rounded-2xl border border-[var(--day-line)] bg-[var(--day-bg)] px-4 py-2.5 lg:top-2"><GroupHead d={d} os={os} open={isOpen(d, os)} onToggle={() => toggle(d, os)} bulk={bulkOf(os)} onBulk={bulkXong} /></div>
            {isOpen(d, os) && (
            <ul className="mt-3 grid gap-3 lg:grid-cols-2">
              {os.map((x) => <CardRow key={x.id} x={x} prices={prices} update={upd} flash={x.id === flash} rowRef={x.id === flash ? endRef : undefined} />)}
            </ul>
            )}
          </section>
        ))}
      </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
        {ready && !orders.length && <p className="w-full rounded-2xl border border-dashed border-line bg-white/60 px-4 py-8 text-center text-[14px] text-ink-3">Chưa có đơn nào. Đơn tự động hiện sau khi máy nhà cài gói WEB TỔNG ĐÀI; đơn cũ: bấm “Nhập đơn cũ từ Sheet”.</p>}
        {orders.length > 0 && <span className="tnum">Đang hiện {fmt(list.length)} đơn trong {groups.length} ngày. Ngày cũ hơn 10 ngày và ngày đã xong hết đơn tự thu gọn, bấm tiêu đề ngày để mở.</span>}
        {orders.length > 0 && !list.length && <Empty />}
        {list.length > 0 && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { if (days.length) setOpen((c) => ({ ...c, [days.at(-1)]: true })); setTimeout(() => { const rows = document.querySelectorAll(innerWidth >= 1400 ? "tbody tr" : "main section li"); rows[rows.length - 1]?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60); }}><ArrowDownToLine />Xuống đơn mới nhất</Button>}
      </div>
    </div>
  );
}

const Row = memo(function Row({ x, prices, update, flash, rowRef }) {
  return (
    <tr ref={rowRef} className={cn("transition-colors hover:bg-wash/50 [content-visibility:auto] [contain-intrinsic-size:auto_64px]", flash && "bg-gold-soft/70")}>
      <td className="py-2.5 pr-2 pl-5">
        <div className="flex items-center"><span className="max-w-[260px] truncate font-medium" title={x.name}>{x.name}</span><CopyBtn text={x.name} className="size-7" /></div>
        <div className="mt-0.5 flex items-center gap-2"><Src s={x.src} /><Where x={x} /></div>
      </td>
      <td className="px-2.5"><Progress x={x} /></td>
      <td className="px-2.5 tnum whitespace-nowrap font-medium"><DueCell x={x} prices={prices} update={update} /></td>
      <td className="px-2.5 whitespace-nowrap"><Left x={x} /></td>
      <td className="px-2.5"><Note x={x} update={update} /></td>
      <td className="px-2.5"><PricePicker value={x.rev} cur={curOf(x.src)} src={x.src} prices={prices} none={x.st === "ban"} onPick={(v) => update(x.id, { rev: v })} /></td>
      <td className="py-2.5 pr-5 pl-2.5"><div className="flex items-center gap-1.5"><StatusPick x={x} update={update} /><QuickXong x={x} update={update} /><DelBtn x={x} update={update} /></div></td>
    </tr>
  );
});
const CardRow = memo(function CardRow({ x, prices, update, flash, rowRef }) {
  return (
    <li ref={rowRef} className={cn("rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-card)] [content-visibility:auto] [contain-intrinsic-size:auto_250px]", flash && "ring-2 ring-gold")}>
      <div className="flex items-start gap-1"><span className="min-w-0 flex-1 text-[14.5px] leading-snug font-semibold break-all">{x.name}</span><CopyBtn text={x.name} className="-mt-1 -mr-1" /></div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><Src s={x.src} /><Where x={x} /><span className="ml-auto flex items-center gap-1.5"><QuickXong x={x} update={update} /><StatusPick x={x} update={update} /></span></div>
      <div className="mt-3"><Progress x={x} wide /></div>
      <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-wash/70 px-3 py-2 text-[13px]">
        <div><dt className="text-ink-3">Đến hạn</dt><dd className="tnum font-medium"><DueCell x={x} prices={prices} update={update} /></dd></div>
        <div><dt className="text-ink-3">Còn lại</dt><dd><Left x={x} /></dd></div>
      </dl>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-[12.5px] text-ink-3">Doanh thu</span>
        <PricePicker value={x.rev} cur={curOf(x.src)} src={x.src} prices={prices} none={x.st === "ban"} onPick={(v) => update(x.id, { rev: v })} />
      </div>
      <div className="mt-2.5 flex items-center gap-2"><div className="min-w-0 flex-1"><Note x={x} update={update} wide /></div><DelBtn x={x} update={update} /></div>
    </li>
  );
});

/* nút nhanh "Đã xong" cho đơn đang hiện Đang cày mà KHÔNG thấy trên máy nào (đơn cũ đã xong nhưng Sheet/web chưa đổi) */
const canXong = (x) => x.st === "cay" && !x.live && !x.xoa;
const canGia = (x) => !x.rev && !x.xoa && x.st !== "ban";       // acc bị khóa: không cần nhập giá

/* xóa dòng (đơn test...): bấm 2 lần. Chỉ ẩn trên web (sua/<id>/xoa), không đụng dữ liệu máy; khôi phục ở bộ lọc "Đã xóa" */
function DelBtn({ x, update }) {
  const [ok, setOk] = useState(false);
  if (x.xoa) return (
    <button type="button" onClick={() => update(x.id, { xoa: "", ...(x.stBo ? { st: "" } : {}) })} className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border border-line bg-white px-2 text-[12px] font-semibold whitespace-nowrap text-ink-2 hover:bg-wash"><RotateCcw className="size-3.5" />Khôi phục</button>
  );
  return (
    <button type="button" onClick={() => { if (!ok) { setOk(true); return; } setOk(false); update(x.id, { xoa: 1 }); }} onBlur={() => setOk(false)}
      aria-label={`Xóa đơn ${x.name}`} title="Xóa dòng đơn này khỏi web (đơn test, đơn nhầm). Bấm 2 lần."
      className={cn("inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full px-1.5 text-[12px] font-semibold whitespace-nowrap", ok ? "bg-err text-white" : "text-ink-3 hover:bg-err-soft hover:text-err-ink")}>
      <Trash2 className="size-3.5" />{ok && "Bấm lần nữa để xóa"}
    </button>
  );
}

/* đến hạn: giá có số ngày -> theo công thức Sheet; giá KHÔNG có số ngày (0đ: khách gửi lại / tặng...) hoặc đã chọn tay -> chọn ngày */
function DueCell({ x, prices, update }) {
  const p = x.rev ? prices.find((q) => q.v === x.rev) : null;
  const tay = !!x.han || (x.rev && (!p || p.d == null));
  if (!tay) return x.due;
  return (
    <span className="inline-flex items-center gap-1">
      <input type="date" value={x.han || ""} onChange={(e) => update(x.id, { han: e.target.value })} aria-label={`Ngày đến hạn đơn ${x.name}`}
        title="Giá này không có số ngày cày: chọn ngày đến hạn tay" className={cn("tnum h-7 w-[124px] rounded-lg border px-1.5 text-[12.5px]", x.han ? "border-line bg-white" : "border-dashed border-warn/60 bg-warn-soft text-warn-ink")} />
    </span>
  );
}
function QuickXong({ x, update }) {
  if (!canXong(x)) return null;
  return (
    <button type="button" onClick={() => update(x.id, { st: "xong" })} title="Đơn này không thấy trên máy nào. Bấm nếu đơn đã cày xong."
      className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border border-ok/40 bg-white px-2 text-[12px] font-semibold whitespace-nowrap text-ok-ink hover:bg-ok-soft">
      <Check className="size-3.5" />Xong
    </button>
  );
}

function Where({ x }) {
  const t = [x.m, x.tab !== "—" && x.tab != null && x.tab !== "" ? `tab ${x.tab}` : ""].filter(Boolean).join(" · ");
  return (
    <>
      <span className="tnum text-[12.5px] text-ink-3">{t || (x.from === "cu" ? "đơn cũ (Sheet)" : "—")}{x.ly ? ` · ${x.ly}` : ""}</span>
      {x.ngoaiSheet && !x.xoa && <span title="Tổng đài đã nối code và tạo gói cho đơn này, nhưng Sheet BACKUP 2026 không có dòng nào cùng tên. Đơn test / làm lại tay: bấm thùng rác để xóa khỏi web." className="rounded-md bg-warn-soft px-1.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap text-warn-ink">Không có trong Sheet</span>}
    </>
  );
}

/* tình trạng: tự động theo máy; bấm để sửa tay (giống cột TÌNH TRẠNG của Sheet) */
function StatusPick({ x, update, className }) {
  const s = STATUS[x.st] || STATUS.cay;
  return (
    <label className={cn("relative inline-flex cursor-pointer", className)} title="Bấm để sửa tình trạng">
      <Badge tone={s.tone} dot>{s.l}<ChevronDown className="-mr-1 size-3 opacity-60" /></Badge>
      <select aria-label={`Tình trạng đơn ${x.name}`} value="" onChange={(e) => update(x.id, { st: e.target.value === "auto" ? null : e.target.value })} className="absolute inset-0 cursor-pointer opacity-0">
        <option value="" disabled>Đổi tình trạng</option>
        {["cay", "xong", "ban", "dung"].map((k) => <option key={k} value={k}>{STATUS[k].l}</option>)}
        <option value="auto">Tự động theo máy</option>
      </select>
    </label>
  );
}

const barTone = (x) => (x.g >= x.tg ? "ok" : x.ls === "late" ? "err" : "gold");
function Progress({ x, wide }) {
  const box = wide ? "" : "w-[148px]";
  if (!(x.tg > 0)) {                                            // chưa có số từ máy: đơn đã xong -> đầy; còn lại -> chưa có số
    const xong = x.st === "xong";
    const ngay = x.live && x.live.td > 0 && x.live.ngay != null ? Math.min(100, (x.live.ngay / x.live.td) * 100) : null;
    return (
      <div className={box}>
        <div className="tnum text-[12.5px] text-ink-3">{ngay != null ? `${Math.floor(x.live.ngay)}/${x.live.td} ngày` : xong ? "Đã xong" : x.from === "cu" ? "Chưa có số (đơn cũ)" : "Chưa thấy trên máy"}</div>
        {(xong || ngay != null) && <div className="mt-1 flex items-center gap-2"><GoldBar pct={xong ? 100 : ngay} tone={xong ? "ok" : "gold"} className="h-1 flex-1" /><span className="tnum w-9 text-right text-[12px] font-semibold text-ok-ink">{xong ? "100%" : `${Math.round(ngay)}%`}</span></div>}
      </div>
    );
  }
  const p = Math.min(100, (x.g / x.tg) * 100);
  return (
    <div className={box}>
      <div className="flex items-center gap-1 whitespace-nowrap tnum text-[12.5px]">
        <span className="font-semibold text-ink">{fmt(x.g)}</span><span className="text-ink-3">/ {fmt(x.tg)}</span><Coin /><span className="sr-only">vàng</span>
        {!x.live && x.kq && <span className="ml-1 text-[11.5px] text-ink-3">(lần cuối thấy)</span>}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <GoldBar pct={p} tone={x.st === "ban" ? "run" : barTone(x)} className="h-1 flex-1" />
        <span className={cn("tnum w-9 text-right text-[12px] font-semibold", p >= 100 ? "text-ok-ink" : x.ls === "late" ? "text-err-ink" : "text-gold-ink")}>{Math.round(p)}%</span>
      </div>
    </div>
  );
}
const parseRev = (os) => os.reduce((a, x) => { if (!x.rev || x.xoa) return a; if (isUsd(x.rev)) a.usd += parseFloat(String(x.rev).replace(",", ".")) || 0; else a.vnd += parseInt(x.rev.replace(/\D/g, "")) || 0; return a; }, { vnd: 0, usd: 0 });
function GroupHead({ d, os, open, onToggle, bulk = [], onBulk }) {
  const [ok, setOk] = useState(false);
  const priced = os.filter((x) => x.rev).length;
  const r = parseRev(os);
  const [y, m, dd] = d.split("-");
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <button type="button" onClick={onToggle} aria-expanded={open} className="inline-flex cursor-pointer items-center gap-1.5 text-[14px] font-extrabold tracking-[0.02em] text-[var(--day-ink)] uppercase">
        <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />Ngày thuê: {dd}/{m}/{y}{d === TODAY && <span className="ml-1 rounded-full bg-[#F5C542] px-2 py-0.5 text-[11px] text-[#2A1E00] normal-case">Hôm nay</span>}
      </button>
      <span className="tnum text-[12.5px] text-[var(--day-ink)] opacity-70">{os.length} đơn</span>
      {bulk.length > 0 && onBulk && (
        <button type="button" onClick={() => { if (!ok) { setOk(true); return; } setOk(false); onBulk(bulk); }} onBlur={() => setOk(false)}
          title={"Không thấy trên máy nào và đã tới hạn / máy của đơn có gửi dữ liệu:\n" + bulk.map((x) => x.name).join("\n")}
          className={cn("inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2 text-[12px] font-semibold whitespace-nowrap", ok ? "border-ok bg-ok text-white" : "border-ok/40 bg-white/80 text-ok-ink hover:bg-ok-soft")}>
          <CheckCheck className="size-3.5" />{ok ? `Bấm lần nữa: ${bulk.length} đơn → Đã xong` : `Đánh dấu xong ${bulk.length} đơn`}
        </button>
      )}
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
function PricePicker({ value, prices, onPick, cur = "both", src, none }) {
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
            : none ? <Chip className="border border-dashed border-line bg-white text-ink-3">Không cần</Chip>
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

/* ---------- thêm đơn tay (GL. / KICK) -> /web/don_tay ---------- */
function AddOrder({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [pre, setPre] = useState("GL.");
  const [name, setName] = useState("");
  const [where, setWhere] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const n = name.trim();
    if (!n) { setErr("Nhập tên đơn, ví dụ NGL236.150K.04/11 M10"); return; }
    const mt = /^\s*M?(\d+)\s*(?:[·.,\s/-]+\s*(?:tab\s*)?(\d+))?\s*$/i.exec(where);
    if (where.trim() && !mt) { setErr("Máy · tab viết kiểu: M10 · 5 (hoặc để trống)"); return; }
    const full = pre === "KICK" ? `KICK.${n}` : `${pre}${n}`;
    const v = { n: full.slice(0, 100), day: TODAY, t: Math.floor(Date.now() / 1000) };
    if (mt) { v.m = "M" + mt[1]; if (mt[2]) v.tab = +mt[2]; }
    if (pre === "KICK") v.note = "Đơn KICK đưa lại";
    setBusy(true);
    try { await onAdd({ id: "t" + Date.now().toString(36), v }); setName(""); setErr(""); setOpen(false); }
    catch (e) { setErr("Chưa lưu được (" + ((e && e.code) || "lỗi mạng") + "). Thử lại."); }
    finally { setBusy(false); }
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild><Button variant="default"><Plus />Thêm đơn tay</Button></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={8} align="end" collisionPadding={12} className="glass pop-in z-50 max-h-[var(--radix-popover-content-available-height)] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-white/80 p-4 shadow-[var(--shadow-float)]">
          <div className="text-[14px] font-semibold">Thêm đơn tay</div>
          <p className="mt-0.5 text-[12.5px] text-ink-2">Ngày thuê = hôm nay. Lưu lên web, mọi máy/điện thoại của bạn đều thấy.</p>
          <div className="mt-3"><Segmented label="Loại đơn" value={pre} onChange={setPre} items={[{ k: "GL.", l: "GL." }, { k: "KICK", l: "KICK" }]} className="w-fit" /></div>
          <label className="mt-3 block text-[12.5px] font-medium text-ink-2">Tên đơn
            <div className="mt-1 flex h-9 items-center rounded-xl border border-line bg-white pl-3 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15">
              <span className="text-[13.5px] font-semibold text-ink-3">{pre === "KICK" ? "KICK." : pre}</span>
              <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="NGL236.150K.04/11 M10" className="h-full min-w-0 flex-1 bg-transparent px-1 text-[13.5px] text-ink focus:outline-none" />
            </div>
          </label>
          <label className="mt-3 block text-[12.5px] font-medium text-ink-2">Máy · tab <span className="font-normal text-ink-3">(không bắt buộc)</span>
            <input value={where} onChange={(e) => { setWhere(e.target.value); setErr(""); }} placeholder="M10 · 5" className="mt-1 h-9 w-full rounded-xl border border-line bg-white px-3 text-[13.5px] text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15" />
          </label>
          {err && <p className="mt-1.5 text-[12.5px] text-err-ink">{err}</p>}
          <Button variant="default" className="mt-4 w-full" onClick={submit} disabled={busy}>{busy ? "Đang lưu…" : "Thêm vào cuối danh sách"}</Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ---------- nhập đơn cũ 1 lần từ file CSV của Sheet ---------- */
function ImportOld({ orders, onSave, again }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = async (f) => {
    setMsg(""); setPlan(null);
    if (!f) return;
    if (f.size > 5e6) { setMsg("File quá lớn (> 5 MB). Hãy tải riêng tab BACKUP 2026."); return; }
    const r = docSheet(await f.text());
    if (r.loi) { setMsg(r.loi); return; }
    const k = keHoachNhap(r.list, orders);
    const days = r.list.map((x) => x.d).sort();
    setPlan({ ...k, n: r.list.length, bo: r.bo, tu: days[0], den: days.at(-1), kb: Math.round(JSON.stringify(k.patch).length / 1024) });
  };
  const go = async () => {
    setBusy(true);
    try { await onSave(plan.patch); setMsg(`Đã nhập ${fmt(plan.them)} đơn cũ.`); setPlan(null); }
    catch (e) { setMsg("Chưa lưu được (" + ((e && e.code) || "lỗi mạng") + "). Không có gì bị đổi, thử lại."); }
    finally { setBusy(false); }
  };
  const d2 = (d) => d.split("-").reverse().join("/");
  return (
    <Popover.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPlan(null); setMsg(""); } }}>
      <Popover.Trigger asChild><Button variant={again ? "ghost" : "outline"}><Upload />{again ? "Nhập lại đơn cũ" : "Nhập đơn cũ từ Sheet"}</Button></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={8} align="end" collisionPadding={12} className="glass pop-in z-50 max-h-[var(--radix-popover-content-available-height)] w-[min(380px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-white/80 p-4 shadow-[var(--shadow-float)]">
          <div className="text-[14px] font-semibold">Nhập đơn cũ từ Google Sheet (1 lần)</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-ink-2">
            <li>Mở Sheet “ĐƠN CÀY VÀNG 2025”, chọn tab <b>BACKUP 2026</b>.</li>
            <li>Tệp → Tải xuống → <b>Giá trị được phân tách bằng dấu phẩy (.csv)</b>.</li>
            <li>Chọn file vừa tải ở dưới. Web chỉ ĐỌC file, xem trước rồi mới lưu.</li>
          </ol>
          {again && <p className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-[12.5px] text-warn-ink">Đã có đơn cũ trên web. Nhập lại sẽ THAY danh sách đơn cũ bằng file mới (giá / ghi chú bạn đã sửa trên web vẫn giữ nếu tên đơn và ngày thuê không đổi).</p>}
          <label className="mt-3 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-white text-[13.5px] font-medium text-ink-2 hover:border-brand">
            <FileUp className="size-4" />Chọn file .csv
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => pick(e.target.files && e.target.files[0])} />
          </label>
          {plan && (
            <div className="mt-3 space-y-1 rounded-xl bg-wash px-3 py-2.5 text-[13px] tnum">
              <div>File có <b>{fmt(plan.n)}</b> đơn, ngày thuê {d2(plan.tu)} → {d2(plan.den)}{plan.bo ? ` · bỏ ${plan.bo} dòng không phải đơn` : ""}.</div>
              <div>Thêm <b>{fmt(plan.them)}</b> đơn cũ · <b>{fmt(plan.ghep)}</b> đơn trùng tên với đơn đã có (chỉ chép giá / ghi chú / Đã Xong sang).</div>
              <div className="text-ink-3">Dung lượng ghi ~{plan.kb} KB (1 lần).</div>
              <Button variant="default" className="mt-2 w-full" onClick={go} disabled={busy}>{busy ? "Đang lưu…" : `Lưu ${fmt(plan.them)} đơn cũ lên web`}</Button>
            </div>
          )}
          {msg && <p role="status" className="mt-2 text-[13px] font-medium text-ink-2">{msg}</p>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
