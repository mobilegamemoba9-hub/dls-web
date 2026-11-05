// TRANG TRA TIẾN ĐỘ CHO ĐỐI TÁC (lát 6, 06/11) - công khai, KHÔNG đăng nhập, KHÔNG dùng Firebase SDK.
// Link: https://mobilegamemoba9-hub.github.io/dls-web/tra/#<khóa 24 ký tự>  (khóa nằm sau dấu # -> không gửi lên máy chủ GitHub)
// Đọc DUY NHẤT 1 chỗ: GET <databaseURL>/pub/dt/<khóa>.json (luật Firebase: đọc từng khóa, không liệt kê được /pub/dt).
// Máy nhà (web_tra.py) ghi dữ liệu 10 phút/lần. Trang tự làm mới 5 phút khi đang mở; nút Làm mới khóa 60 giây; cache 60 giây.
// (6c) 4 ngôn ngữ EN / VI / BN / UZ; mỗi đơn 1 dòng gọn bấm để mở; 3 khu Đang làm / Hoàn thành / Đã dừng (2 khu sau thu gọn);
//      NGL xếp số nhỏ lên trên, IML xếp ngày cũ rồi số nhỏ; nút chép tiến độ 1 đơn; nhãn "Mới" cho đơn vừa xong/dừng từ lần mở trước.
import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { RefreshCw, Search, X, ChevronDown, Copy, Check } from "lucide-react";
import "../index.css";
import { cn, GoldBar, Coin, Gem } from "../ui.jsx";
import { firebaseConfig } from "../firebase-config.js";
import { T, NUT, TEN_NN } from "./lang.js";

const KHOA_RE = /^[a-z2-9]{20,40}$/;
const AUTO_MS = 5 * 60 * 1000;
const CHAN_MS = 60 * 1000;
const CU_MS = 30 * 60 * 1000;             // dữ liệu cũ hơn 30 phút -> báo "có thể chậm"
const MOCK = typeof window !== "undefined" ? window.__TRA_MOCK__ : undefined;
const NGON_NGU = ["en", "vi", "bn", "uz"];

const TONE_S = { noi: "wait", cay: "run", cho: "wait", tam: "warn", gd: "warn", xong: "ok", dung: "err", ket: "off" };
const DOT = { wait: "bg-wait", run: "bg-run", warn: "bg-warn", ok: "bg-ok", err: "bg-err", off: "bg-off" };
const CHU = { wait: "text-wait-ink", run: "text-run-ink", warn: "text-warn-ink", ok: "text-ok-ink", err: "text-err-ink", off: "text-ink-3" };
const NHOM = (s) => (s === "xong" || s === "ket" ? "done" : s === "dung" ? "stop" : "run");

const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* chế độ riêng tư */ } };
const khoaTuHash = () => { const h = decodeURIComponent((location.hash || "").replace(/^#\/?/, "")).trim().toLowerCase(); return KHOA_RE.test(h) ? h : ""; };
const so = (n) => { const m = /(?:NGL|IML)(\d+)/i.exec(String(n || "")) || /(\d+)/.exec(String(n || "")); return m ? +m[1] : 1e9; };

function useFmt(lang) {
  return useMemo(() => {
    const loc = lang === "vi" ? "vi-VN" : "en-US";              // UZ: tự đổi dấu phẩy -> khoảng trắng (nhiều trình duyệt thiếu dữ liệu tiếng Uzbek)
    const tz = lang === "vi" ? { timeZone: "Asia/Ho_Chi_Minh" } : {};
    let num, d1;
    try { num = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }); d1 = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }); }
    catch { num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }); d1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }); }
    const dtf = new Intl.DateTimeFormat("en-US", { ...tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const dtv = new Intl.DateTimeFormat("en-US", { ...tz, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const hmf = new Intl.DateTimeFormat("en-US", { ...tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const parts = (f, d) => Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
    // EN: "Nov 5, 21:10" · VI/BN/UZ: "05/11 21:10" (tự ghép, không phụ thuộc kiểu trình duyệt)
    const dt = (s) => { const o = parts(lang === "en" ? dtf : dtv, new Date(s * 1000)); return lang === "en" ? `${o.month} ${o.day}, ${o.hour}:${o.minute}` : `${o.day}/${o.month} ${o.hour}:${o.minute}`; };
    const hm = (ms) => { const o = parts(hmf, new Date(ms)); return `${o.hour}:${o.minute}`; };
    let zone = "";
    try { zone = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName")?.value || ""; } catch { zone = ""; }
    const uz = (x) => (lang === "uz" ? x.replace(/,/g, "\u00a0").replace(/\./g, ",") : x);
    return { n: (v) => uz(num.format(Math.round(+v || 0))), pc: (v) => uz(num.format(Math.round(+v || 0))) + "%", d1: (v) => uz(d1.format(+v || 0)), dt, hm, zone };
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

// giờ cày lại = 07:00 giờ VN = 00:00 UTC kế tiếp
const ve7h = (now) => { const d = new Date(now); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1); };

function ghiChu(x, t, f, now) {
  if (x.s === "noi") return t.noi;
  if (x.cs) return t.cs;
  if (x.s === "cho") return t.cho(f.hm(ve7h(now)));
  if (x.s === "tam") return t.tam;
  if (x.s === "gd") return t.gd;
  if (x.s === "dung") return t.r[x.r] || t.r.khac;
  return "";
}
const full100 = (x) => x.s === "cho" || +x.mt >= 100;

// 1 dòng chép gửi khách: "NGL269.30K.29/10(8179) M48 — Farming · 24,000/30,000 gold (80%) · Matches today 45/100 · Est. finish ~2 days"
function textChep(x, t, f, now) {
  const a = [`${x.ten || x.n}${!x.ten && x.a ? " " + x.a : ""} — ${t.s[x.s]}`];
  if (x.tg > 0) a.push(`${f.n(x.g)}/${f.n(x.tg)} ${t.gold} (${f.pc(x.pc)})`);
  else if (+x.td > 0) a.push(`${t.day(f.d1(Math.min(+x.nd || 0, +x.td)), f.d1(x.td))} (${f.pc(x.pc)})`);
  if (x.tk > 0) a.push(`${f.n(x.k)}/${f.n(x.tk)} ${t.gems}`);
  if (x.nhom === "run" && x.mt != null && x.s !== "noi") a.push(full100(x) ? t.full : `${t.matches} ${f.n(x.mt)}/100`);
  if (x.nhom === "run" && x.e != null && x.s !== "noi") a.push(`${t.eta} ${t.etaTxt(+x.e)}`);
  if (x.nhom !== "run" && x.tx > 0) a.push(`${t.finished} ${f.dt(x.tx)}`);
  const g = x.s === "dung" ? ghiChu(x, t, f, now) : "";
  return a.join(" · ") + (g ? ` — ${g}` : "");
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
  const lang = NGON_NGU.includes(langPick) ? langPick : data && NGON_NGU.includes(data.l) ? data.l : (navigator.language || "").toLowerCase().startsWith("vi") ? "vi" : "en";
  const t = T[lang];
  const f = useFmt(lang);
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("all");
  const [mo, setMo] = useState(() => ({ run: true, done: false, stop: false, ...(lsGet("tra:mo") || {}) }));
  const [moDon, setMoDon] = useState(() => new Set());
  const [moi, setMoi] = useState(() => new Set());
  const busyRef = useRef(false);
  const seenRef = useRef(undefined);

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

  const ds = useMemo(() => Object.entries((data && data.o) || {}).filter(([, x]) => x && typeof x === "object" && TONE_S[x.s])
    .map(([id, x]) => ({ id, ...x, g: +x.g || 0, tg: +x.tg || 0, k: +x.k || 0, tk: +x.tk || 0, nhom: NHOM(x.s) })), [data]);

  // nhãn "Mới": đơn xong/dừng chưa có ở lần mở trước (lần mở đầu tiên: không đánh dấu gì)
  useEffect(() => {
    if (!k || !data) return;
    const key = "tra:seen:" + k;
    if (seenRef.current === undefined) seenRef.current = lsGet(key);
    const prev = seenRef.current;
    const ended = ds.filter((x) => x.nhom !== "run").map((x) => x.id);
    if (Array.isArray(prev)) setMoi(new Set(ended.filter((id) => !prev.includes(id))));
    lsSet(key, [...new Set([...(Array.isArray(prev) ? prev : []), ...ended])].slice(-600));
  }, [k, data, ds]);

  const chon = (l) => { setLangPick(l); lsSet("tra:lang", l); };
  const doiMo = (g) => setMo((m) => { const v = { ...m, [g]: !m[g] }; lsSet("tra:mo", v); return v; });
  const doiDon = (id) => setMoDon((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const conLai = Math.min(60, Math.max(0, Math.ceil((at + CHAN_MS - now) / 1000)));

  const p = (data && data.p) || "";
  const cmp = p === "IML"
    ? (a, b) => (String(a.d || "") === String(b.d || "") ? so(a.n) - so(b.n) : String(a.d || "") < String(b.d || "") ? -1 : 1)     // IML: ngày cũ -> số nhỏ
    : (a, b) => so(a.n) - so(b.n) || (String(a.d || "") < String(b.d || "") ? -1 : 1);                                                // NGL: số nhỏ lên trên
  const dem = useMemo(() => ({ run: ds.filter((x) => x.nhom === "run").length, done: ds.filter((x) => x.nhom === "done").length, stop: ds.filter((x) => x.nhom === "stop").length,
    gold: ds.filter((x) => x.nhom === "run").reduce((a, x) => a + x.g, 0) }), [ds]);
  const qq = q.trim().toLowerCase().replace(/\s+/g, "");
  const loc2 = ds.filter((x) => (loc === "all" || x.nhom === loc) && (!qq || String(x.n).toLowerCase().includes(qq) || String(x.ten || "").toLowerCase().replace(/\s+/g, "").includes(qq)));
  const nhom = { run: loc2.filter((x) => x.nhom === "run").sort(cmp), done: loc2.filter((x) => x.nhom === "done").sort(cmp), stop: loc2.filter((x) => x.nhom === "stop").sort(cmp) };
  const moThat = (g) => mo[g] || loc === g || !!qq;     // lọc đúng khu hoặc đang tìm -> tự mở

  const nodeT = data && data.t ? data.t * 1000 : 0;
  const cu = nodeT && now - nodeT > CU_MS;
  const nut = NUT[p] || NUT[""];

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-14 pt-[max(16px,env(safe-area-inset-top))] sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-ink-3">{t.sub}</p>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">{t.title}</h1>
          {p && <p className="mt-0.5 text-[14px] font-medium text-ink-2">{t.partner(p)}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={t.lang} className="inline-flex rounded-xl border border-line bg-white p-0.5 shadow-[var(--shadow-card)]">
            {nut.map((l) => (
              <button key={l} type="button" onClick={() => chon(l)} aria-pressed={lang === l} lang={l}
                className={cn("h-8 min-w-11 cursor-pointer rounded-[10px] px-2.5 text-[13px] font-semibold transition-colors", lang === l ? "bg-brand text-white" : "text-ink-2 hover:bg-wash")}>{TEN_NN[l]}</button>
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
          <main className="space-y-4">
            <p className="tnum text-[13px] text-ink-3">
              {t.updated}: {nodeT ? `${f.dt(nodeT / 1000)} · ${t.ago(Math.floor((now - nodeT) / 60000))}` : "—"}
              {err && <span className="ml-2 font-medium text-err-ink">· {t.net}</span>}
            </p>
            {cu && <div className="rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3 text-[13.5px] text-warn-ink">{t.stale}</div>}

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
              <O nhan={t.tiles.run} so={f.n(dem.run)} tone="run" />
              <O nhan={t.tiles.done} so={f.n(dem.done)} tone="ok" />
              <O nhan={t.tiles.stop} so={f.n(dem.stop)} tone="err" />
              <O nhan={t.tiles.gold} so={<span className="inline-flex items-center gap-1.5">{f.n(dem.gold)}<Coin className="size-[0.85em]" /></span>} tone="gold" />
            </div>

            <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 bg-canvas/90 px-4 py-2 backdrop-blur-sm sm:static sm:mx-0 sm:flex-row sm:items-center sm:rounded-[var(--radius-card)] sm:border sm:border-line sm:bg-white sm:p-3 sm:shadow-[var(--shadow-card)] sm:backdrop-blur-none">
              <div className="flex min-w-0 gap-1 overflow-x-auto" role="group">
                {["all", "run", "done", "stop"].map((x) => (
                  <button key={x} type="button" onClick={() => setLoc(x)} aria-pressed={loc === x}
                    className={cn("h-8 shrink-0 cursor-pointer rounded-[10px] px-3 text-[13px] font-medium whitespace-nowrap transition-colors", loc === x ? "bg-ink text-white" : "bg-white text-ink-2 hover:bg-wash sm:bg-transparent")}>
                    {t.f[x]}{x !== "all" && <span className="tnum ml-1.5 opacity-70">{f.n(dem[x])}</span>}
                  </button>
                ))}
              </div>
              <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15 sm:ml-auto sm:max-w-[320px]">
                <Search className="size-4 shrink-0 text-ink-3" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-ink focus:outline-none" />
                {q && <button type="button" onClick={() => setQ("")} aria-label={t.clear} className="grid size-6 cursor-pointer place-items-center rounded-md text-ink-3 hover:bg-wash"><X className="size-3.5" /></button>}
              </label>
            </div>

            {!ds.length ? <Thong t={t.empty} tone="off" nho />
              : !loc2.length ? <Thong t={t.none} tone="off" nho />
              : ["run", "done", "stop"].filter((g) => nhom[g].length).map((g) => (
                <Nhom key={g} g={g} ten={t.sec[g]} n={nhom[g].length} moi={nhom[g].filter((x) => moi.has(x.id)).length} t={t} f={f} mo={moThat(g)} onDoi={() => doiMo(g)}>
                  {nhom[g].map((x) => <Dong key={x.id} x={x} t={t} f={f} now={now} mo={moDon.has(x.id)} onDoi={() => doiDon(x.id)} moi={moi.has(x.id)} />)}
                </Nhom>
              ))}
            <p className="pt-2 text-center text-[12.5px] text-ink-3">{t.foot(f.zone)}</p>
          </main>
        )}
    </div>
  );
}

function O({ nhan, so: s, tone }) {
  const c = { run: "text-run-ink", ok: "text-ok-ink", err: "text-err-ink", gold: "text-gold-ink" }[tone];
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-white px-3.5 py-2.5 shadow-[var(--shadow-card)] sm:rounded-[var(--radius-card)] sm:px-4 sm:py-3">
      <div className="truncate text-[12px] font-medium text-ink-3 sm:text-[12.5px]">{nhan}</div>
      <div className={cn("tnum mt-0.5 text-[21px] font-bold leading-tight sm:text-[24px]", c)}>{s}</div>
    </div>
  );
}

function Nhom({ g, ten, n, moi, t, f, mo, onDoi, children }) {
  const tone = { run: "run", done: "ok", stop: "err" }[g];
  return (
    <section>
      <button type="button" onClick={onDoi} aria-expanded={mo}
        className="mb-2 flex w-full cursor-pointer items-center gap-2 rounded-xl py-1 text-left text-[15px] font-semibold text-ink">
        <span className={cn("size-2 rounded-full", DOT[tone])} />
        {ten}<span className="tnum text-[13px] font-medium text-ink-3">{f.n(n)}</span>
        {moi > 0 && <span className="rounded-full bg-brand px-1.5 py-px text-[11px] font-bold text-white">{f.n(moi)} {t.neu}</span>}
        <span className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-3">{mo ? t.hide : t.show}<ChevronDown className={cn("size-4 transition-transform", mo && "rotate-180")} /></span>
      </button>
      {mo && <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">{children}</div>}
    </section>
  );
}

function Dong({ x, t, f, now, mo, onDoi, moi }) {
  const tone = TONE_S[x.s];
  const coVang = x.tg > 0 && x.s !== "noi" && !x.cs;
  const coNgay = !x.tg && +x.td > 0 && x.s !== "noi";
  const coSo = coVang || coNgay || (x.tk > 0 && x.s !== "noi");
  const pct = Math.max(0, Math.min(100, +x.pc || 0));
  const barTone = x.s === "xong" ? "ok" : x.s === "dung" ? "err" : coNgay ? "run" : "gold";
  const gc = ghiChu(x, t, f, now);
  const ten = x.ten || x.n;
  return (
    <article className={cn("min-w-0 rounded-2xl border bg-white shadow-[var(--shadow-card)] transition-colors", mo ? "border-brand/40" : "border-line")}>
      <button type="button" onClick={onDoi} aria-expanded={mo} className="block w-full cursor-pointer px-3.5 py-2.5 text-left">
        <div className="flex items-center gap-2">
          {moi && <span className="shrink-0 rounded-md bg-brand px-1.5 py-px text-[10.5px] font-bold uppercase text-white">{t.neu}</span>}
          <span className={cn("min-w-0 flex-1 text-[14px] font-semibold leading-snug text-ink", mo ? "[overflow-wrap:anywhere]" : "truncate")} title={ten}>{ten}</span>
          {x.a && !x.ten && <span className="tnum shrink-0 rounded-md bg-wash px-1.5 py-px text-[11.5px] font-semibold text-ink-2">{x.a}</span>}
          {coSo && <span className="tnum shrink-0 text-[14px] font-bold text-ink">{f.pc(pct)}</span>}
          <ChevronDown className={cn("size-4 shrink-0 text-ink-3 transition-transform", mo && "rotate-180")} />
        </div>
        {coSo && <GoldBar pct={pct} tone={barTone} className="mt-1.5 h-1.5" />}
        <div className="tnum mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12.5px]">
          <span className={cn("inline-flex items-center gap-1 font-medium", CHU[tone])}><span className={cn("size-1.5 rounded-full", DOT[tone])} />{t.s[x.s]}</span>
          {x.nhom === "run" && x.mt != null && x.s !== "noi" && (full100(x)
            ? <span className="rounded-md bg-wait-soft px-1.5 font-semibold text-wait-ink">{t.full}</span>
            : <span className="text-ink-3">{t.matches} <b className="font-semibold text-ink">{f.n(x.mt)}/100</b></span>)}
          {x.nhom === "run" && x.e != null && x.s !== "noi" && <span className="text-ink-3">{t.eta} <b className="font-semibold text-ink">{t.etaTxt(+x.e)}</b></span>}
          {x.nhom !== "run" && x.tx > 0 && <span className="text-ink-3">{t.finished} <b className="font-medium text-ink-2">{f.dt(x.tx)}</b></span>}
        </div>
      </button>
      {mo && (
        <div className="border-t border-line-2 px-3.5 pb-3 pt-2.5 text-[13px]">
          {coVang && (
            <div className="tnum flex flex-wrap items-center gap-x-1 text-ink-2">
              <span className="font-semibold text-ink">{f.n(x.g)}</span><span>/ {f.n(x.tg)}</span><Coin className="size-[1.05em]" /><span className="sr-only">{t.gold}</span>
            </div>
          )}
          {coNgay && <div className="tnum text-ink-2">{t.day(f.d1(Math.min(+x.nd || 0, +x.td)), f.d1(x.td))}</div>}
          {x.tk > 0 && x.s !== "noi" && (
            <div className="tnum mt-1 inline-flex items-center gap-1 text-ink-2">
              <span className="font-semibold text-ink">{f.n(x.k)}</span><span>/ {f.n(x.tk)}</span><Gem className="size-[1.05em]" /><span className="sr-only">{t.gems}</span>
            </div>
          )}
          {gc && <p className={cn("mt-1.5 leading-snug", x.s === "dung" ? "text-err-ink" : x.s === "gd" || x.s === "tam" ? "text-warn-ink" : "text-ink-2")}>{gc}</p>}
          <div className="tnum mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
            {x.t0 > 0 && <span><span className="text-ink-3">{t.received} </span><span className="font-medium text-ink-2">{f.dt(x.t0)}</span></span>}
            <Chep text={textChep(x, t, f, now)} t={t} />
          </div>
        </div>
      )}
    </article>
  );
}

function Chep({ text, t }) {
  const [ok, setOk] = useState(false);
  const id = useRef();
  const go = () => {
    const xong = () => { setOk(true); clearTimeout(id.current); id.current = setTimeout(() => setOk(false), 1600); };
    try { navigator.clipboard.writeText(text).then(xong, xong); } catch { xong(); }
  };
  return (
    <button type="button" onClick={go} data-chep={text}
      className={cn("ml-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12.5px] font-medium hover:bg-wash", ok ? "text-ok-ink" : "text-ink")}>
      {ok ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{ok ? t.copied : t.copy}
    </button>
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[70px] animate-pulse rounded-2xl bg-white/70" />)}</div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-white/70" />)}</div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
