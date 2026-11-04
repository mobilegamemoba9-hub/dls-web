import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { LayoutGrid, Server, ListChecks, BarChart3, BellRing, RefreshCw, Palette, LogOut } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import "./index.css";
import { cn, SampleTag, ShellPicker, SHELLS, Button } from "./ui.jsx";
import { alerts as alertsData, initialOrders, initialPrices } from "./data.js";
import TongQuan from "./pages/TongQuan.jsx";
import May from "./pages/May.jsx";
import Don from "./pages/Don.jsx";
import DoanhThu from "./pages/DoanhThu.jsx";
import CanhBao from "./pages/CanhBao.jsx";
import { Gate, UidRow, logout } from "./auth.jsx";
import { readWeb, configured } from "./firebase.js";

const NAV = [
  { k: "tong-quan", l: "Tổng quan", I: LayoutGrid },
  { k: "may", l: "Máy", I: Server },
  { k: "don", l: "Đơn", I: ListChecks },
  { k: "doanh-thu", l: "Doanh thu", I: BarChart3 },
  { k: "canh-bao", l: "Cảnh báo", I: BellRing },
];
const MOBILE = ["tong-quan", "don", "doanh-thu", "canh-bao"];
const hm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

function useHash() {
  const read = () => { const [v, arg] = location.hash.slice(1).split("/"); return { v: NAV.some((n) => n.k === v) ? v : "tong-quan", arg }; };
  const [h, setH] = useState(read);
  useEffect(() => { const f = () => { setH(read()); window.scrollTo(0, 0); }; addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return h;
}

const LAM_MOI_MS = 120000;

/* Trạng thái nhánh /web trên Firebase (chỉ đọc). Trang vẫn hiện dữ liệu mẫu cho tới lát 2. */
function useWeb(user, tick) {
  const [st, setSt] = useState({ k: configured ? "dang" : "chua_noi" });
  useEffect(() => {
    if (!user) return;
    let huy = false;
    readWeb("may").then(
      (v) => { if (!huy) setSt(v ? { k: "co", n: Object.keys(v).length } : { k: "trong" }); },
      (e) => { if (!huy) setSt({ k: String(e && (e.code || e.message)).toLowerCase().includes("permission") ? "cam" : "loi" }); }
    );
    return () => { huy = true; };
  }, [user, tick]);
  return st;
}
const WEB_TEXT = {
  chua_noi: "Chưa nối Firebase",
  dang: "Đang đọc Firebase…",
  cam: "Firebase: chưa mở quyền đọc nhánh /web (đổi luật ở lát 2)",
  trong: "Firebase: nối được, chưa có máy nào gửi dữ liệu",
  loi: "Firebase: lỗi đọc, thử Làm mới",
};
const webText = (w) => (w.k === "co" ? `Firebase: ${w.n} máy đã gửi dữ liệu (hiện lên trang từ lát 2)` : WEB_TEXT[w.k]);

function App({ user }) {
  const { v, arg } = useHash();
  const [orders, setOrders] = useState(initialOrders);
  const [prices, setPrices] = useState(initialPrices);
  const [rate, setRate] = useState(25800);
  const [upd, setUpd] = useState("21:25");
  const [tick, setTick] = useState(0);
  const openAlerts = alertsData.filter((a) => a.sev !== "info").length;
  const [shell, setShellRaw] = useState(() => { try { const v = localStorage.getItem("shell"); return SHELLS.some((x) => x.k === v) ? v : "sky"; } catch { return "sky"; } });
  const setShell = (k) => { setShellRaw(k); try { localStorage.setItem("shell", k); } catch {} };
  useEffect(() => { document.documentElement.dataset.shell = shell; }, [shell]);
  const last = useRef(0);
  const refresh = () => { last.current = Date.now(); setUpd(hm(new Date())); setTick((t) => t + 1); };
  const web = useWeb(user, tick);
  useEffect(() => {                                           // tự làm mới mỗi 2 phút, CHỈ khi trang đang hiện
    last.current = Date.now(); setUpd(hm(new Date()));
    const id = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, LAM_MOI_MS);
    const vis = () => { if (document.visibilityState === "visible" && Date.now() - last.current >= LAM_MOI_MS) refresh(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const page = {
    "tong-quan": <TongQuan upd={upd} />,
    may: <May code={arg} />,
    don: <Don orders={orders} setOrders={setOrders} prices={prices} />,
    "doanh-thu": <DoanhThu rate={rate} setRate={setRate} prices={prices} setPrices={setPrices} />,
    "canh-bao": <CanhBao />,
  }[v];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      {/* ---- menu trái (máy tính) ---- */}
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-hidden text-[var(--sh-ink)] lg:flex" style={{ background: "var(--sh-bg)" }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "var(--sh-glow)" }} />
        <div className="relative flex h-full flex-col px-4 py-6">
          <a href="#tong-quan" className="px-3 text-[17px] leading-[1.15] font-extrabold tracking-[-0.01em]">QUẢN LÍ<br /><span className="text-[var(--sh-accent)]">HỆ THỐNG</span></a>
          <nav className="mt-9 flex flex-col gap-1" aria-label="Trang">
            {NAV.map(({ k, l, I }) => (
              <a key={k} href={`#${k}`} aria-current={v === k ? "page" : undefined}
                className={cn("flex h-10 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium transition-colors",
                  v === k ? "bg-[var(--sh-active)] font-semibold text-[var(--sh-ink)] shadow-[0_1px_3px_oklch(0.3_0.05_250/0.12)]" : "text-[var(--sh-mute)] hover:bg-[var(--sh-hover)] hover:text-[var(--sh-ink)]")}>
                <I className={cn("size-[18px]", v === k && "text-[var(--sh-accent)]")} strokeWidth={1.9} />
                <span className="flex-1">{l}</span>
                {k === "canh-bao" && <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-err px-1.5 text-[11.5px] font-semibold text-white">{openAlerts}</span>}
              </a>
            ))}
          </nav>
          <div className="mt-auto space-y-3 px-1">
            <div className="space-y-3 rounded-xl bg-[var(--sh-panel)] px-3 py-2.5">
              <ShellPicker value={shell} onChange={setShell} dark />
            </div>
            <SampleTag />
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--sh-panel)] px-3 py-2.5">
              <div className="text-[12.5px] leading-tight">
                <div className="text-[var(--sh-mute)]">Cập nhật lúc</div>
                <div className="tnum font-semibold">{upd}</div>
              </div>
              <button type="button" onClick={refresh} aria-label="Làm mới" className="grid size-9 cursor-pointer place-items-center rounded-lg text-[var(--sh-mute)] transition-colors hover:bg-[var(--sh-hover)] hover:text-[var(--sh-ink)]"><RefreshCw className="size-4" /></button>
            </div>
            <p className="px-2 text-[12px] text-[var(--sh-mute)]">Tự làm mới mỗi 2 phút khi trang đang mở.</p>
            {user && (
              <div className="rounded-xl bg-[var(--sh-panel)] px-3 py-2.5">
                <div className="truncate text-[12.5px] font-semibold" title={user.email}>{user.email}</div>
                <UidRow uid={user.uid} dark />
                <button type="button" onClick={logout} className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-medium text-[var(--sh-mute)] hover:text-[var(--sh-ink)]"><LogOut className="size-3.5" />Đăng xuất</button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* ---- thanh trên (điện thoại) ---- */}
        <header style={{ backgroundImage: "linear-gradient(90deg, color-mix(in oklch, var(--sh-soft) 70%, transparent), transparent)" }} className="glass sticky top-[env(safe-area-inset-top,0px)] z-30 flex items-center gap-2 border-b border-white/60 py-2.5 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] lg:hidden">
          <a href="#tong-quan" className="text-[14px] leading-tight font-extrabold tracking-[-0.01em] text-[var(--sh-text)]">QUẢN LÍ <span className="text-[var(--sh-solid)]">HỆ THỐNG</span></a>
          <SampleTag className="ml-auto" />
          <Popover.Root>
            <Popover.Trigger className="grid size-9 cursor-pointer place-items-center rounded-xl text-ink-2 hover:bg-white" aria-label="Màu menu và tài khoản"><Palette className="size-4" /></Popover.Trigger>
            <Popover.Portal>
              <Popover.Content align="end" sideOffset={8} collisionPadding={12} className="glass pop-in z-50 rounded-2xl border border-white/80 p-3.5 shadow-[var(--shadow-float)]">
                <ShellPicker value={shell} onChange={setShell} />
                {user && (
                  <div className="mt-3 w-[min(260px,calc(100vw-48px))] border-t border-line pt-3">
                    <div className="truncate text-[12.5px] font-semibold">{user.email}</div>
                    <UidRow uid={user.uid} />
                    <Button size="sm" onClick={logout} className="mt-2 w-full justify-center"><LogOut />Đăng xuất</Button>
                  </div>
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <button type="button" onClick={refresh} aria-label={`Làm mới, cập nhật lúc ${upd}`} className="grid size-9 place-items-center rounded-xl text-ink-2 hover:bg-white cursor-pointer"><RefreshCw className="size-4" /></button>
        </header>

        <main key={v + tick} className="page-in mx-auto w-full max-w-[1280px] pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-28 sm:px-6 lg:px-8 xl:px-10 lg:pt-9 lg:pb-14">
          {page}
          <p className="mt-10 text-center text-[12.5px] text-ink-3">Dữ liệu mẫu · {webText(web)}.</p>
        </main>
      </div>

      {/* ---- 4 nút dưới (điện thoại) ---- */}
      <nav aria-label="Trang" className="glass fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-white/70 pr-[max(8px,env(safe-area-inset-right,0px))] pl-[max(8px,env(safe-area-inset-left,0px))] pt-1.5 pb-[max(env(safe-area-inset-bottom),0.4rem)] shadow-[0_-8px_24px_-12px_oklch(0.3_0.04_168/0.18)] lg:hidden">
        {NAV.filter((n) => MOBILE.includes(n.k)).map(({ k, l, I }) => {
          const on = v === k || (k === "tong-quan" && v === "may");
          return (
            <a key={k} href={`#${k}`} aria-current={on ? "page" : undefined} className={cn("relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11.5px] font-medium", on ? "text-[var(--sh-text)]" : "text-ink-3")}>
              <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", on && "bg-[var(--sh-soft)]")}><I className="size-[19px]" strokeWidth={on ? 2.2 : 1.9} /></span>
              {l}
              {k === "canh-bao" && <span className="tnum absolute top-0.5 right-[calc(50%-22px)] grid h-4 min-w-4 place-items-center rounded-full bg-err px-1 text-[10px] font-semibold text-white">{openAlerts}</span>}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

function Root() {
  useEffect(() => { try { const k = localStorage.getItem("shell"); if (SHELLS.some((x) => x.k === k)) document.documentElement.dataset.shell = k; } catch {} }, []);
  return <Gate>{(user) => <App user={user} />}</Gate>;
}

createRoot(document.getElementById("root")).render(<StrictMode><Root /></StrictMode>);
