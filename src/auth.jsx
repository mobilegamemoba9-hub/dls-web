import { useEffect, useState } from "react";
import { LogOut, Copy, Check, ShieldCheck } from "lucide-react";
import { configured, mock, watchUser, login, logout, allowed, loginError } from "./firebase.js";
import { Button } from "./ui.jsx";

/* Cửa vào trang: chưa cấu hình Firebase -> dữ liệu mẫu; có cấu hình -> phải đăng nhập Google đúng tài khoản. */
export function Gate({ children }) {
  const [user, setUser] = useState(undefined);              // undefined = đang kiểm
  useEffect(() => watchUser(setUser), []);
  if (mock) return children({ uid: "mock", email: "thu@may" });
  if (!configured) return children(null);
  if (user === undefined) return <Splash />;
  if (!user) return <Login />;
  if (!allowed(user)) return <Denied user={user} />;
  return children(user);
}

function Shell({ children }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="glass page-in w-full max-w-[400px] rounded-[1.5rem] border border-white/80 p-7 shadow-[var(--shadow-float)] sm:p-8">
        <div className="text-[22px] leading-[1.1] font-extrabold tracking-[-0.01em] text-[var(--sh-text)]">QUẢN LÍ<br /><span className="text-[var(--sh-solid)]">HỆ THỐNG</span></div>
        {children}
      </div>
    </main>
  );
}

function Splash() {
  return <Shell><p className="mt-6 text-[14px] text-ink-3" role="status">Đang kiểm tra đăng nhập…</p></Shell>;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

function Login() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setBusy(true); setErr("");
    try { await login(); } catch (e) { setErr(loginError(e)); } finally { setBusy(false); }
  };
  return (
    <Shell>
      <p className="mt-5 text-[14.5px] text-ink-2">Trang riêng để theo dõi máy, đơn và doanh thu. Đăng nhập bằng tài khoản Google của chủ hệ thống.</p>
      <Button onClick={go} disabled={busy} className="mt-6 h-11 w-full justify-center gap-2.5 rounded-xl bg-white text-[15px] font-semibold">
        <GoogleMark />{busy ? "Đang mở Google…" : "Đăng nhập bằng Google"}
      </Button>
      {err && <p role="alert" className="mt-3 rounded-xl bg-err-soft px-3 py-2 text-[13.5px] text-err-ink">{err}</p>}
      <p className="mt-6 flex items-center gap-1.5 text-[12.5px] text-ink-3"><ShieldCheck className="size-3.5" />Chỉ tài khoản được cấp quyền mới xem được dữ liệu.</p>
    </Shell>
  );
}

function Denied({ user }) {
  return (
    <Shell>
      <p className="mt-5 text-[14.5px] font-semibold text-err-ink">Tài khoản này không được vào trang.</p>
      <p className="mt-1.5 text-[14px] text-ink-2 break-all">{user.email}</p>
      <UidRow uid={user.uid} />
      <Button onClick={logout} className="mt-6 w-full justify-center"><LogOut />Đăng xuất, chọn tài khoản khác</Button>
    </Shell>
  );
}

export function UidRow({ uid, dark }) {
  const [ok, setOk] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(uid); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} };
  return (
    <div className={dark ? "mt-1" : "mt-4 rounded-xl bg-wash/80 px-3 py-2"}>
      <div className={dark ? "text-[11.5px] text-[var(--sh-mute)]" : "text-[12px] text-ink-3"}>Mã tài khoản (UID)</div>
      <div className="flex items-center gap-1.5">
        <code className={"min-w-0 flex-1 truncate text-[12.5px] " + (dark ? "text-[var(--sh-ink)]" : "text-ink")}>{uid}</code>
        <button type="button" onClick={copy} aria-label="Chép UID" className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg hover:bg-black/5">{ok ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button>
      </div>
    </div>
  );
}

export { logout };
