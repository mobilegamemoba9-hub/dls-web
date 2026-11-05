import { useState } from "react";
import { ArrowRight, Server, Radio } from "lucide-react";
import { Card, Segmented, Badge, SampleTag, cn } from "../ui.jsx";
import { alerts as mau } from "../data.js";
import { tdAlerts } from "../store.js";

const SEV = { err: { l: "Lỗi", tone: "err" }, warn: { l: "Cần xem", tone: "warn" }, info: { l: "Thông tin", tone: "info" } };
const pad = (n) => String(n).padStart(2, "0");
function ngay(ts) {
  const d = new Date(ts), h = new Date(); h.setHours(0, 0, 0, 0);
  const diff = Math.round((h.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  return diff <= 0 ? "Hôm nay" : diff === 1 ? "Hôm qua" : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
const gio = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export default function CanhBao({ live, data, issues }) {
  const [f, setF] = useState("all");
  const real = !!live;
  // ĐANG CÓ: việc đang hỏng lúc này (máy + máy nhà). LỊCH SỬ: tin #canh-bao Tổng đài 3 ngày gần nhất.
  const now = (issues || []).map((a) => ({ ...a, day: "Đang có", time: a.time || "bây giờ" }));
  const hist = real ? tdAlerts(data).map((a) => ({ ...a, day: ngay(a.ts), time: gio(a.ts) })) : [];
  const all = real ? [...now, ...hist] : mau;
  const list = all.filter((a) => f === "all" || a.src === f);
  const days = [...new Set(list.map((a) => a.day))];
  return (
    <div className="mx-auto max-w-[820px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">Cảnh báo</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">{real ? "“Đang có” = đang hỏng lúc này. Bên dưới là tin #canh-bao của Tổng đài 3 ngày gần nhất, mới nhất ở trên." : "Gom từ mọi máy và Tổng đài, mới nhất ở trên."}</p>
        </div>
        {!real && <SampleTag />}
      </div>
      <Segmented label="Nguồn cảnh báo" value={f} onChange={setF} className="w-fit"
        items={[{ k: "all", l: "Tất cả", c: all.length }, { k: "Máy", l: "Máy", c: all.filter((a) => a.src === "Máy").length }, { k: "Tổng đài", l: "Tổng đài", c: all.filter((a) => a.src === "Tổng đài").length }]} />
      {real && !(data && data.nha) && <p className="rounded-xl bg-warn-soft px-4 py-2.5 text-[13.5px] text-warn-ink">Máy nhà chưa gửi dữ liệu (chưa cài gói WEB TỔNG ĐÀI) — chưa có cảnh báo Tổng đài.</p>}
      {days.map((d) => (
        <section key={d} aria-label={d}>
          <h2 className="mb-2 px-1 text-[13px] font-semibold text-ink-3">{d}</h2>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line-2">
              {list.filter((a) => a.day === d).map((a) => {
                const I = a.src === "Máy" ? Server : Radio;
                return (
                  <li key={a.id} className={cn("flex gap-3.5 px-5 py-4", a.sev === "err" && "bg-err-soft/50")}>
                    <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl", a.sev === "err" ? "bg-err text-white" : a.sev === "warn" ? "bg-warn-soft text-warn-ink" : "bg-run-soft text-run-ink")}><I className="size-[18px]" strokeWidth={1.9} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className={cn("min-w-0 text-[15px] font-semibold break-words", a.sev === "err" && "text-err-ink")}>{a.t}</span>
                        <Badge tone={SEV[a.sev].tone} dot>{SEV[a.sev].l}</Badge>
                        <span className="tnum ml-auto text-[12.5px] text-ink-3">{a.src} · {a.time}</span>
                      </div>
                      {a.p && <p className="mt-1 text-[14px] break-words whitespace-pre-line text-ink-2">{a.p}</p>}
                      {a.go && <a href={`#may/${a.go}`} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-brand-ink hover:underline underline-offset-4">Xem máy {a.go}<ArrowRight className="size-3.5" /></a>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      ))}
      {!list.length && <p className="py-10 text-center text-ink-3">Không có cảnh báo nào.</p>}
    </div>
  );
}
