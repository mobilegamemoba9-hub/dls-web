// TRANG TRA TIẾN ĐỘ CHO ĐỐI TÁC (lát 6, 06/11) - công khai, KHÔNG đăng nhập, KHÔNG dùng Firebase SDK.
// Link: https://mobilegamemoba9-hub.github.io/dls-web/tra/#<khóa 24 ký tự>  (khóa nằm sau dấu # -> không gửi lên máy chủ GitHub)
// Đọc DUY NHẤT 1 chỗ: GET <databaseURL>/pub/dt/<khóa>.json (luật Firebase: đọc từng khóa, không liệt kê được /pub/dt).
// Máy nhà (web_tra.py) ghi dữ liệu 10 phút/lần. Trang tự làm mới 5 phút khi đang mở; nút Làm mới khóa 60 giây; cache 60 giây.
import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { RefreshCw, Search, X } from "lucide-react";
import "../index.css";
import { cn, Badge, GoldBar, Coin, Gem } from "../ui.jsx";
import { firebaseConfig } from "../firebase-config.js";

const KHOA_RE = /^[a-z2-9]{20,40}$/;
const AUTO_MS = 5 * 60 * 1000;
const CHAN_MS = 60 * 1000;
const CU_MS = 30 * 60 * 1000;             // dữ liệu cũ hơn 30 phút -> báo "có thể chậm"
const MOCK = typeof window !== "undefined" ? window.__TRA_MOCK__ : undefined;
const DOI_TAC = { NGL: "Nextgen DLS", IML: "Ismoilov" };

const T = {
  en: {
    title: "Order progress", sub: "DLS farming service", partner: (p) => `${DOI_TAC[p] || p} · ${p} orders`,
    refresh: "Refresh", wait: (s) => `Refresh (${s}s)`, updated: "Updated", ago: (m) => (m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`),
    stale: "Data may be delayed. Our system will update it automatically.",
    search: "Search order, e.g. NGL205", clear: "Clear search",
    f: { all: "All", run: "In progress", done: "Completed", stop: "Stopped" },
    tiles: { run: "In progress", done: "Completed (7 days)", stop: "Stopped (7 days)", gold: "Gold farmed (in progress)" },
    sec: { run: "In progress", end: "Finished in the last 7 days" },
    s: { noi: "Linking code", cay: "Farming", cho: "Daily limit reached", tam: "Paused", gd: "Temporarily interrupted", xong: "Completed", dung: "Stopped", ket: "Ended" },
    r: { kick: "The account was signed in on another device (kicked).", cancel: "Gold or gems were spent while we were farming.", khoa: "Please contact us.", khac: "Please contact us." },
    noi: "We received your code and are linking the account. This usually takes 1–3 minutes.",
    cs: "Linked. Waiting for the first progress update.",
    cho: (t) => `The game allows 100 matches per day. Farming resumes at ${t}.`,
    tam: "Paused for a moment. Farming will resume soon.",
    gd: "We're fixing a small issue. The numbers below may be a little old.",
    received: "Received", eta: "Est. finish", finished: "Finished",
    etaTxt: (d) => (d === 0 ? "Today" : d === 1 ? "Tomorrow" : `~${d} days`),
    day: (a, b) => `Day ${a} of ${b}`, gold: "gold", gems: "gems",
    matches: "Matches today", full: "Full 100 games",
    none: "No orders match.", empty: "No orders right now.",
    noKey: "Open the tracking link you received from us.", notFound: "This link was not found or has expired. Please ask us for a new link.",
    net: "Couldn't load the data. Check your connection and try again.", retry: "Try again",
    foot: (z) => `Updated about every 10 minutes. Times are shown in your local time (${z}). Questions? Message us on Messenger.`,
    lang: "Language",
  },
  vi: {
    title: "Tiến độ đơn", sub: "Dịch vụ cày DLS", partner: (p) => `${DOI_TAC[p] || p} · đơn ${p}`,
    refresh: "Làm mới", wait: (s) => `Làm mới (${s}s)`, updated: "Cập nhật", ago: (m) => (m < 1 ? "vừa xong" : m < 60 ? `${m} phút trước` : `${Math.floor(m / 60)} giờ ${m % 60} phút trước`),
    stale: "Số liệu có thể đang chậm. Hệ thống sẽ tự cập nhật lại.",
    search: "Tìm đơn, vd NGL205", clear: "Xóa ô tìm",
    f: { all: "Tất cả", run: "Đang làm", done: "Hoàn thành", stop: "Đã dừng" },
    tiles: { run: "Đang làm", done: "Hoàn thành (7 ngày)", stop: "Đã dừng (7 ngày)", gold: "Vàng đã cày (đơn đang làm)" },
    sec: { run: "Đang làm", end: "Kết thúc trong 7 ngày qua" },
    s: { noi: "Đang nối code", cay: "Đang cày", cho: "Đủ 100 trận, chờ 7h", tam: "Tạm dừng", gd: "Tạm gián đoạn", xong: "Hoàn thành", dung: "Đã dừng", ket: "Đã kết thúc" },
    r: { kick: "Acc bị đăng nhập ở máy khác (KICK).", cancel: "Vàng hoặc KC bị tiêu trong lúc cày.", khoa: "Vui lòng liên hệ với chúng tôi.", khac: "Vui lòng liên hệ với chúng tôi." },
    noi: "Đã nhận code, đang nối acc. Thường mất 1–3 phút.",
    cs: "Đã nối xong. Đang chờ số liệu đầu tiên.",
    cho: (t) => `Game cho chơi 100 trận mỗi ngày. Cày tiếp lúc ${t}.`,
    tam: "Tạm dừng một chút, sẽ cày tiếp sớm.",
    gd: "Đang xử lý một lỗi nhỏ. Số bên dưới có thể hơi cũ.",
    received: "Nhận", eta: "Dự kiến xong", finished: "Kết thúc",
    etaTxt: (d) => (d === 0 ? "Hôm nay" : d === 1 ? "Ngày mai" : `~${d} ngày`),
    day: (a, b) => `Ngày ${a}/${b}`, gold: "vàng", gems: "KC",
    matches: "Trận hôm nay", full: "Full 100 trận",
    none: "Không có đơn nào khớp.", empty: "Hiện chưa có đơn nào.",
    noKey: "Hãy mở đúng link tra cứu bạn được gửi.", notFound: "Không tìm thấy link này hoặc link đã hết hạn. Hãy hỏi chúng tôi link mới.",
    net: "Không tải được dữ liệu. Kiểm tra mạng rồi thử lại.", retry: "Thử lại",
    foot: () => "Cập nhật khoảng 10 phút/lần. Giờ hiển thị theo giờ Việt Nam. Thắc mắc nhắn chúng tôi qua Messenger.",
    lang: "Ngôn ngữ",
  },
};

const TONE_S = { noi: "wait", cay: "run", cho: "wait", tam: "warn", gd: "warn", xong: "ok", dung: "err", ket: "off" };
const NHOM = (s) => (s === "xong" || s === "ket" ? "done" : s === "dung" ? "stop" : "run");

const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* chế độ riêng tư */ } };
const khoaTuHash = () => { const h = decodeURIComponent((location.hash || "").replace(/^#\/?/, "")).trim().toLowerCase(); return KHOA_RE.test(h) ? h : ""; };
const so = (n) => { const m = /(\d+)/.exec(String(n || "")); return m ? +m[1] : 1e9; };

function useFmt(lang) {
  return useMemo(() => {
    const loc = lang === "vi" ? "vi-VN" : "en-US";
    const tz = lang === "vi" ? { timeZone: "Asia/Ho_Chi_Minh" } : {};
    const num = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
    const pc = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
    const d1 = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 });
    const dtf = new Intl.DateTimeFormat("en-US", { ...tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const dtv = new Intl.DateTimeFormat("en-US", { ...tz, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const dt = { format: (d) => {                                   // EN: "Nov 5, 21:10" · VI: "05/11 23:10" (tự ghép, không phụ thuộc kiểu trình duyệt)
      const o = Object.fromEntries((lang === "vi" ? dtv : dtf).formatToParts(d).map((x) => [x.type, x.value]));
      return lang === "vi" ? `${o.day}/${o.month} ${o.hour}:${o.minute}` : `${o.month} ${o.day}, ${o.hour}:${o.minute}`;
    } };
    const hm = new Intl.DateTimeFormat(loc, { ...tz, hour: "2-digit", minute: "2-digit", hour12: false });
    let zone = "";
    try { zone = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName")?.value || ""; } catch { zone = ""; }
    return { n: (v) => num.format(Math.round(+v || 0)), pc: (v) => pc.format(+v || 0) + "%", d1: (v) => d1.format(+v || 0), dt: (s) => dt.format(new Date(s * 1000)), hm: (ms) => hm.format(new Date(ms)), zone };
  }, [lang]);
}

async function taiDuLieu(k) {
  if (MOCK !== undefined) {
    await new Promise((r) => setTimeout(r, 30));
    const v = typeof MOCK === "function" ? MOCK(k) : MOCK;
    if (v === "net") throw new Error("net");
    return v ?? null;
  }
  const url = `${firebaseConfig.databaseURL}/pub/dt/${k}.json`;
  let res;
  try { res = await fetch(url, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" }); } catch { throw new Error("net"); }
  if (res.status === 401 || res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error("net");
  return res.json();
}

function App() {
  const [k, setK] = useState(khoaTuHash);
  const cache0 = k ? lsGet("tra:" + k) : null;
  const [data, setData] = useState(cache0 ? cache0.d : undefined);   // undefined = đang tải, null = không thấy
  const [at, setAt] = useState(cache0 ? cache0.at : 0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [langPick, setLangPick] = useState(() => lsGet("tra:lang"));
  const lang = langPick === "vi" || langPick === "en" ? langPick : data && (data.l === "vi" || data.l === "en") ? data.l : (navigator.language || "").toLowerCase().startsWith("vi") ? "vi" : "en";
  const t = T[lang];
  const f = useFmt(lang);
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("all");
  const busyRef = useRef(false);

  useEffect(() => { document.documentElement.lang = lang; document.title = t.title; }, [lang, t]);
  useEffect(() => { const on = () => { setK(khoaTuHash()); }; addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);

  const tai = useCallback(async (force) => {
    if (!k || busyRef.current) return;
    const c = lsGet("tra:" + k);
    if (!force && c && Date.now() - c.at < CHAN_MS) { setData(c.d); setAt(c.at); return; }
    busyRef.current = true; setBusy(true); setErr("");
    try {
      const d = await taiDuLieu(k);
      const v = d && typeof d === "object" && d.o && typeof d.o === "object" ? d : d && typeof d === "object" ? { ...d, o: {} } : null;
      const ts = Date.now();
      setData(v); setAt(ts); lsSet("tra:" + k, { at: ts, d: v });
    } catch { setErr("net"); }
    finally { busyRef.current = false; setBusy(false); }
  }, [k]);

  useEffect(() => {
    if (!k) { setData(null); return; }
    const c = lsGet("tra:" + k);
    if (c) { setData(c.d); setAt(c.at); } else setData(undefined);
    tai(false);
  }, [k, tai]);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const auto = setInterval(() => { if (document.visibilityState === "visible") tai(true); }, AUTO_MS);
    const vis = () => { if (document.visibilityState === "visible" && Date.now() - (lsGet("tra:" + k)?.at || 0) > AUTO_MS) tai(true); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(tick); clearInterval(auto); document.removeEventListener("visibilitychange", vis); };
  }, [k, tai]);

  const chon = (l) => { setLangPick(l); lsSet("tra:lang", l); };
  const conLai = Math.min(60, Math.max(0, Math.ceil((at + CHAN_MS - now) / 1000)));

  const ds = useMemo(() => Object.entries((data && data.o) || {}).filter(([, x]) => x && typeof x === "object" && TONE_S[x.s])
    .map(([id, x]) => ({ id, ...x, g: +x.g || 0, tg: +x.tg || 0, k: +x.k || 0, tk: +x.tk || 0, nhom: NHOM(x.s) })), [data]);
  const dem = useMemo(() => ({ run: ds.filter((x) => x.nhom === "run").length, done: ds.filter((x) => x.nhom === "done").length, stop: ds.filter((x) => x.nhom === "stop").length,
    gold: ds.filter((x) => x.nhom === "run").reduce((a, x) => a + x.g, 0) }), [ds]);
  const qq = q.trim().toLowerCase().replace(/\s+/g, "");
  const loc2 = ds.filter((x) => (loc === "all" || x.nhom === loc) && (!qq || String(x.n).toLowerCase().includes(qq) || String(x.ten || "").toLowerCase().replace(/\s+/g, "").includes(qq)));
  const dang = loc2.filter((x) => x.nhom === "run").sort((a, b) => (a.d === b.d ? so(a.n) - so(b.n) : a.d < b.d ? -1 : 1));
  const xong = loc2.filter((x) => x.nhom !== "run").sort((a, b) => (b.tx || 0) - (a.tx || 0));

  const nodeT = data && data.t ? data.t * 1000 : 0;
  const cu = nodeT && now - nodeT > CU_MS;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-14 pt-[max(16px,env(safe-area-inset-top))] sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-ink-3">{t.sub}</p>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">{t.title}</h1>
          {data && data.p && <p className="mt-0.5 text-[14px] font-medium text-ink-2">{t.partner(data.p)}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label={t.lang} className="inline-flex rounded-xl border border-line bg-white p-0.5 shadow-[var(--shadow-card)]">
            {["en", "vi"].map((l) => (
              <button key={l} type="button" onClick={() => chon(l)} aria-pressed={lang === l}
                className={cn("h-8 min-w-11 cursor-pointer rounded-[10px] px-3 text-[13px] font-semibold transition-colors", lang === l ? "bg-brand text-white" : "text-ink-2 hover:bg-wash")}>{l.toUpperCase()}</button>
            ))}
          </div>
          {k && data !== null && (
            <button type="button" onClick={() => tai(true)} disabled={busy || conLai > 0}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[13.5px] font-medium text-ink shadow-[var(--shadow-card)] hover:bg-wash disabled:cursor-default disabled:opacity-50">
              <RefreshCw className={cn("size-4", busy && "animate-spin")} />{conLai > 0 && !busy ? t.wait(conLai) : t.refresh}
            </button>
          )}
        </div>
      </header>

      {!k ? <Thong t={t.noKey} />
        : data === undefined && !err ? <DangTai />
        : data === undefined && err ? <Thong t={t.net} nut={t.retry} onNut={() => tai(true)} tone="err" />
        : data === null ? <Thong t={err ? t.net : t.notFound} nut={err ? t.retry : null} onNut={() => tai(true)} tone={err ? "err" : "off"} />
        : (
          <main className="space-y-5">
            <p className="tnum text-[13px] text-ink-3">
              {t.updated}: {nodeT ? `${f.dt(nodeT / 1000)} · ${t.ago(Math.floor((now - nodeT) / 60000))}` : "—"}
              {err && <span className="ml-2 font-medium text-err-ink">· {t.net}</span>}
            </p>
            {cu && <div className="rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3 text-[13.5px] text-warn-ink">{t.stale}</div>}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <O nhan={t.tiles.run} so={f.n(dem.run)} tone="run" />
              <O nhan={t.tiles.done} so={f.n(dem.done)} tone="ok" />
              <O nhan={t.tiles.stop} so={f.n(dem.stop)} tone="err" />
              <O nhan={t.tiles.gold} so={<span className="inline-flex items-center gap-1.5">{f.n(dem.gold)}<Coin className="size-[0.85em]" /></span>} tone="gold" />
            </div>

            <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-white p-3 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-wrap gap-1" role="group">
                {["all", "run", "done", "stop"].map((x) => (
                  <button key={x} type="button" onClick={() => setLoc(x)} aria-pressed={loc === x}
                    className={cn("h-8 cursor-pointer rounded-[10px] px-3 text-[13px] font-medium whitespace-nowrap transition-colors", loc === x ? "bg-ink text-white" : "text-ink-2 hover:bg-wash")}>
                    {t.f[x]}{x !== "all" && <span className="tnum ml-1.5 opacity-70">{f.n(dem[x])}</span>}
                  </button>
                ))}
              </div>
              <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15 sm:max-w-[320px] sm:ml-auto">
                <Search className="size-4 shrink-0 text-ink-3" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-ink focus:outline-none" />
                {q && <button type="button" onClick={() => setQ("")} aria-label={t.clear} className="grid size-6 cursor-pointer place-items-center rounded-md text-ink-3 hover:bg-wash"><X className="size-3.5" /></button>}
              </label>
            </div>

            {!ds.length ? <Thong t={t.empty} tone="off" nho />
              : !dang.length && !xong.length ? <Thong t={t.none} tone="off" nho />
              : (
                <>
                  {dang.length > 0 && <Nhom ten={t.sec.run} n={dang.length} f={f}>{dang.map((x) => <The key={x.id} x={x} t={t} f={f} now={now} />)}</Nhom>}
                  {xong.length > 0 && <Nhom ten={t.sec.end} n={xong.length} f={f}>{xong.map((x) => <The key={x.id} x={x} t={t} f={f} now={now} />)}</Nhom>}
                </>
              )}
            <p className="pt-2 text-center text-[12.5px] text-ink-3">{t.foot(f.zone)}</p>
          </main>
        )}
    </div>
  );
}

function O({ nhan, so: s, tone }) {
  const c = { run: "text-run-ink", ok: "text-ok-ink", err: "text-err-ink", gold: "text-gold-ink" }[tone];
  return (
    <div className="min-w-0 rounded-[var(--radius-card)] border border-line bg-white px-4 py-3 shadow-[var(--shadow-card)]">
      <div className="truncate text-[12.5px] font-medium text-ink-3">{nhan}</div>
      <div className={cn("tnum mt-0.5 text-[24px] font-bold leading-tight", c)}>{s}</div>
    </div>
  );
}

function Nhom({ ten, n, f, children }) {
  return (
    <section>
      <h2 className="mb-2 flex items-baseline gap-2 text-[15px] font-semibold text-ink">{ten}<span className="tnum text-[13px] font-medium text-ink-3">{f.n(n)}</span></h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function The({ x, t, f, now }) {
  const tone = TONE_S[x.s];
  const coVang = x.tg > 0 && x.s !== "noi" && !x.cs;
  const coNgay = !x.tg && +x.td > 0 && x.s !== "noi";
  const coKC = x.tk > 0 && x.s !== "noi";
  const pct = Math.max(0, Math.min(100, +x.pc || 0));
  const ve7h = (() => { const d = new Date(now); const u = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1); return f.hm(u); })();
  let ghiChu = "";
  if (x.s === "noi") ghiChu = t.noi;
  else if (x.cs) ghiChu = t.cs;
  else if (x.s === "cho") ghiChu = t.cho(ve7h);
  else if (x.s === "tam") ghiChu = t.tam;
  else if (x.s === "gd") ghiChu = t.gd;
  else if (x.s === "dung") ghiChu = t.r[x.r] || t.r.khac;
  const barTone = x.s === "xong" ? "ok" : x.s === "dung" ? "err" : "gold";
  return (
    <article className="min-w-0 rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={cn("min-w-0 font-bold tracking-[-0.01em] text-ink", x.ten ? "[overflow-wrap:anywhere] text-[14.5px] leading-snug" : "truncate text-[16px]")}>{x.ten || x.n}</span>
          {x.a && !x.ten && <span className="tnum rounded-md bg-wash px-1.5 py-0.5 text-[12px] font-semibold text-ink-2">{x.a}</span>}
        </div>
        <Badge tone={tone} dot className="shrink-0">{t.s[x.s]}</Badge>
      </div>

      {coVang && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
            <span className="tnum inline-flex min-w-0 flex-wrap items-center gap-x-1 text-ink-2">
              <span className="font-semibold text-ink">{f.n(x.g)}</span><span>/ {f.n(x.tg)}</span><Coin className="size-[1.05em]" /><span className="sr-only">{t.gold}</span>
            </span>
            <span className="tnum shrink-0 font-semibold text-ink">{f.pc(pct)}</span>
          </div>
          <GoldBar pct={pct} tone={barTone} className="mt-1.5 h-2" />
        </div>
      )}
      {coNgay && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
            <span className="tnum text-ink-2">{t.day(f.d1(Math.min(+x.nd || 0, +x.td)), f.d1(x.td))}</span>
            <span className="tnum shrink-0 font-semibold text-ink">{f.pc(pct)}</span>
          </div>
          <GoldBar pct={pct} tone={barTone === "gold" ? "run" : barTone} className="mt-1.5 h-2" />
        </div>
      )}
      {coKC && (
        <div className="tnum mt-2 inline-flex items-center gap-1 text-[13.5px] text-ink-2">
          <span className="font-semibold text-ink">{f.n(x.k)}</span><span>/ {f.n(x.tk)}</span><Gem className="size-[1.05em]" /><span className="sr-only">{t.gems}</span>
        </div>
      )}
      {ghiChu && <p className={cn("mt-2.5 text-[13px] leading-snug", x.s === "dung" ? "text-err-ink" : x.s === "gd" || x.s === "tam" ? "text-warn-ink" : "text-ink-2")}>{ghiChu}</p>}

      <dl className="tnum mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line-2 pt-2.5 text-[12.5px]">
        {x.t0 > 0 && <div className="flex gap-1"><dt className="text-ink-3">{t.received}</dt><dd className="font-medium text-ink-2">{f.dt(x.t0)}</dd></div>}
        {x.nhom === "run" && x.mt != null && x.s !== "noi" && (x.s === "cho" || +x.mt >= 100
          ? <div className="flex gap-1"><dd className="rounded-md bg-wait-soft px-1.5 font-semibold text-wait-ink">{t.full}</dd></div>
          : <div className="flex gap-1"><dt className="text-ink-3">{t.matches}</dt><dd className="font-medium text-ink">{f.n(x.mt)}/100</dd></div>)}
        {x.nhom === "run" && x.e != null && x.s !== "noi" && <div className="flex gap-1"><dt className="text-ink-3">{t.eta}</dt><dd className="font-medium text-ink">{t.etaTxt(+x.e)}</dd></div>}
        {x.nhom !== "run" && x.tx > 0 && <div className="flex gap-1"><dt className="text-ink-3">{t.finished}</dt><dd className="font-medium text-ink-2">{f.dt(x.tx)}</dd></div>}
      </dl>
    </article>
  );
}

function Thong({ t, nut, onNut, tone = "off", nho }) {
  return (
    <div className={cn("mx-auto max-w-[520px] rounded-[var(--radius-card)] border border-line bg-white px-5 text-center shadow-[var(--shadow-card)]", nho ? "py-6" : "mt-6 py-10")}>
      <p className={cn("text-[15px]", tone === "err" ? "text-err-ink" : "text-ink-2")}>{t}</p>
      {nut && <button type="button" onClick={onNut} className="mt-4 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-4 text-[14px] font-medium text-white hover:bg-brand-ink"><RefreshCw className="size-4" />{nut}</button>}
    </div>
  );
}

function DangTai() {
  return (
    <div className="space-y-3 pt-2" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[74px] animate-pulse rounded-[var(--radius-card)] bg-white/70" />)}</div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-[150px] animate-pulse rounded-[var(--radius-card)] bg-white/70" />)}</div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
