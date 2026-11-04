import { useState } from "react";
import { ArrowRight, Server, Radio } from "lucide-react";
import { Card, Dot, Segmented, Badge, cn } from "../ui.jsx";
import { alerts } from "../data.js";

const SEV = { err: { l: "Lỗi", tone: "err" }, warn: { l: "Cần xem", tone: "warn" }, info: { l: "Thông tin", tone: "info" } };

export default function CanhBao() {
  const [f, setF] = useState("all");
  const list = alerts.filter((a) => f === "all" || a.src === f);
  const days = [...new Set(list.map((a) => a.day))];
  return (
    <div className="mx-auto max-w-[820px] space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">Cảnh báo</h1>
        <p className="mt-1 text-[13.5px] text-ink-2">Gom từ mọi máy và Tổng đài, mới nhất ở trên.</p>
      </div>
      <Segmented label="Nguồn cảnh báo" value={f} onChange={setF} className="w-fit"
        items={[{ k: "all", l: "Tất cả", c: alerts.length }, { k: "Máy", l: "Máy", c: alerts.filter((a) => a.src === "Máy").length }, { k: "Tổng đài", l: "Tổng đài", c: alerts.filter((a) => a.src === "Tổng đài").length }]} />
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
                        <span className={cn("text-[15px] font-semibold", a.sev === "err" && "text-err-ink")}>{a.t}</span>
                        <Badge tone={SEV[a.sev].tone} dot>{SEV[a.sev].l}</Badge>
                        <span className="tnum ml-auto text-[12.5px] text-ink-3">{a.src} · {a.time}</span>
                      </div>
                      <p className="mt-1 text-[14px] text-ink-2">{a.p}</p>
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
