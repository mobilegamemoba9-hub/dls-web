import { ArrowRight, Cpu, Radio, Bot, Inbox, Power, TrendingDown } from "lucide-react";
import { Card, CardHead, Badge, Dot, CountUp, GoldBar, Gold, CopyBtn, Button, cn, TONE } from "../ui.jsx";
import { machines, alerts, soon, slow } from "../data.js";

export default function TongQuan({ upd }) {
  const issues = alerts.filter((a) => a.day === "Hôm nay" && a.sev !== "info");
  const nErr = issues.filter((a) => a.sev === "err").length;
  const nWarn = issues.length - nErr;
  const sev = nErr ? "err" : nWarn ? "warn" : "ok";
  const okM = machines.filter((m) => m.s === "ok");
  const live = machines.filter((m) => m.s !== "err").length;
  const cay = machines.reduce((a, m) => a + m.cay + m.cho, 0);
  const cho = machines.reduce((a, m) => a + m.cho, 0);
  const san = machines.reduce((a, m) => a + m.san, 0);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* ===== CÓ GÌ HỎNG KHÔNG (hào quang trạng thái) ===== */}
      <div className="aura" data-sev={sev}>
        <section className="glass rounded-[28px] border border-white/80 shadow-[var(--shadow-float)]" aria-labelledby="tq-h">
          <div className="px-5 pt-6 pb-2 sm:px-7 sm:pt-7">
            <div className={cn("inline-flex max-w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 sm:px-5",
              sev === "err" ? "border-err/40 bg-err-soft" : sev === "warn" ? "border-warn/45 bg-warn-soft" : "border-ok/40 bg-ok-soft")}>
              <Dot tone={sev} pulse={sev === "err"} className="size-3.5" />
              <h1 id="tq-h" className="text-[20px] leading-[1.2] font-extrabold tracking-[0.005em] uppercase sm:text-[27px]">
                {sev === "ok" ? <span className="text-ok-ink">Mọi máy đang chạy ổn</span> : (
                  <>{nErr > 0 && <span className="block whitespace-nowrap text-err-ink sm:inline">{nErr} máy mất tín hiệu</span>}{nErr > 0 && nWarn > 0 && <span className="mx-3 hidden text-ink-3/60 sm:inline">·</span>}{nWarn > 0 && <span className="block whitespace-nowrap text-warn-ink sm:inline">{nWarn} việc cần xem</span>}</>
                )}
              </h1>
            </div>
            <p className="mt-3 text-[13.5px] text-ink-2">Tối thứ Tư 4/11 · cập nhật lúc <span className="tnum">{upd}</span></p>
          </div>

          {/* danh sách việc cần xử lý */}
          <ul className="mt-3 divide-y divide-ink/8 px-2 sm:px-3">
            {issues.map((a) => (
              <li key={a.id}>
                <a href={a.go ? `#may/${a.go}` : "#canh-bao"} className="group flex items-start gap-3 rounded-2xl px-3 py-3.5 transition-colors hover:bg-white/70 sm:px-4">
                  <Dot tone={a.sev} pulse={a.sev === "err"} className="mt-[7px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <span className={cn("text-[15.5px] font-semibold", a.sev === "err" ? "text-err-ink" : "text-ink")}>{a.t}</span>
                      <span className="text-[12.5px] text-ink-3">{a.src} · <span className="tnum">{a.time}</span></span>
                    </div>
                    <p className="mt-0.5 text-[14px] text-ink-2">{a.p}</p>
                  </div>
                  <span className="mt-1 hidden shrink-0 items-center gap-1 text-[13px] font-medium text-ink-2 group-hover:text-ink sm:inline-flex">
                    {a.go ? `Xem ${a.go}` : "Xem"} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </a>
              </li>
            ))}
          </ul>

          {/* 4 số chính */}
          <dl className="mt-2 grid grid-cols-2 border-t border-ink/8 sm:grid-cols-4">
            {[
              { l: "máy có tín hiệu", v: <span><CountUp to={live} />/{machines.length}</span>, tone: live < machines.length ? "err" : "ok" },
              { l: <>tab đang cày · <span className="tnum">{cho}</span> full 100 trận</>, v: <CountUp to={cay} />, tone: "run" },
              { l: "tab sẵn sàng nhận đơn", v: <CountUp to={san} />, tone: "ok" },
              { l: "đơn mới hôm nay", v: <CountUp to={9} />, tone: "gold" },
            ].map((s, i) => (
              <div key={i} className={cn("px-5 py-4 sm:px-7", i % 2 === 1 && "border-l border-ink/8", i >= 2 && "border-t border-ink/8 sm:border-t-0", i === 2 && "sm:border-l")}>
                <dt className="sr-only">{typeof s.l === "string" ? s.l : "tab đang cày"}</dt>
                <dd className="flex items-center gap-2 text-[26px] leading-none font-bold tracking-[-0.02em] tnum sm:text-[28px]"><Dot tone={s.tone} className="size-2" />{s.v}</dd>
                <div aria-hidden="true" className="mt-1.5 text-[13px] text-ink-2">{s.l}</div>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* máy đang ổn */}
          <Card>
            <CardHead title={<>Máy đang ổn <span className="tnum font-normal text-ink-3">· {okM.length}</span></>} right={<span className="text-[12.5px] text-ink-3">Bấm để xem từng tab</span>} />
            <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-3">
              {okM.map((m) => (
                <a key={m.code} href={`#may/${m.code}`} className="group rounded-2xl border border-line-2 bg-wash/60 px-3.5 py-3 transition-[background-color,border-color,transform] hover:-translate-y-px hover:border-line hover:bg-white">
                  <div className="flex items-center gap-2"><Dot tone="ok" className="size-2" /><span className="font-semibold">{m.code}</span><span className="ml-auto text-[12px] text-ink-3 tnum">{m.hb}</span></div>
                  <div className="mt-1.5 text-[13px] text-ink-2 tnum"><span className="text-run-ink font-medium">{m.cay}</span> cày · <span className="text-ok-ink font-medium">{m.san}</span> sẵn sàng</div>
                  {m.cpu > 85 && <div className="mt-1 flex items-center gap-1 text-[12.5px] text-warn-ink"><Cpu className="size-3.5" />CPU {m.cpu}%</div>}
                </a>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* đơn sắp xong */}
            <Card>
              <CardHead title="Đơn sắp xong" sub="Hôm nay và ngày mai" right={<Badge tone="gold" className="tnum">{soon.length} đơn</Badge>} />
              <ul className="px-2 pb-3">
                {soon.map((s) => (
                  <li key={s.n} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-wash/70">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium" title={s.n}>{s.n}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <GoldBar pct={s.p} className="h-1 flex-1" />
                        <span className="tnum text-[12.5px] font-semibold text-gold-ink">{s.p}%</span>
                        <span className={cn("w-[62px] text-right text-[12.5px]", s.d === "Hôm nay" ? "font-semibold text-ok-ink" : "text-ink-3")}>{s.d}</span>
                      </div>
                    </div>
                    <CopyBtn text={s.n} />
                  </li>
                ))}
              </ul>
            </Card>

            {/* tab cày chậm */}
            <Card>
              <CardHead title="Tab cày chậm bất thường" sub="Sản lượng hôm nay so với các tab cùng máy" right={<Badge tone="warn" className="tnum">{slow.length} tab</Badge>} />
              <ul className="space-y-1 px-2 pb-3">
                {slow.map((s) => (
                  <li key={s.w} className="rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="size-4 text-warn-ink" />
                      <span className="font-semibold">{s.w}</span>
                      <span className="ml-auto truncate text-[12.5px] text-ink-3">{s.n}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-2"><div className="h-full rounded-full bg-warn" style={{ width: `${s.ratio * 100}%` }} /></div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[13px]"><span className="text-ink-3">Hôm nay</span><Gold n={s.today} className="text-warn-ink" /><span className="text-ink-3">· {s.note}</span></div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          {/* số thứ tự đơn */}
          <Card>
            <CardHead title="Số thứ tự đơn" />
            <div className="grid grid-cols-2 gap-px overflow-hidden border-y border-line-2 bg-line-2">
              <div className="bg-white px-5 py-3.5"><div className="text-[12.5px] text-ink-3">NGL kế tiếp</div><div className="mt-0.5 text-[22px] font-bold tracking-[-0.01em] tnum">NGL235</div></div>
              <div className="bg-white px-5 py-3.5"><div className="text-[12.5px] text-ink-3">IML hôm nay</div><div className="mt-0.5 text-[22px] font-bold tracking-[-0.01em] tnum">IML5</div></div>
            </div>
            <div className="flex items-start gap-3 px-5 py-4">
              <Badge tone="warn" dot>TREO</Badge>
              <p className="text-[13.5px] text-ink-2"><span className="font-semibold text-ink">NGL233</span> lỗi NO_LINK_BUTTON trên M38 tab 7.</p>
            </div>
          </Card>

          {/* máy nhà */}
          <Card>
            <CardHead title="Máy nhà" />
            <ul className="divide-y divide-line-2 border-t border-line-2">
              {[
                { I: Radio, l: "Tổng đài", v: "Đang nhận code", tone: "ok" },
                { I: Bot, l: "Bot Discord", v: "Online", tone: "ok" },
                { I: Inbox, l: "Code chờ gán", v: "0", tone: "off" },
              ].map(({ I, l, v, tone }) => (
                <li key={l} className="flex items-center gap-3 px-5 py-3">
                  <I className="size-4 text-ink-3" strokeWidth={1.9} />
                  <span className="text-[14px]">{l}</span>
                  <span className={cn("ml-auto inline-flex items-center gap-1.5 text-[13.5px] font-medium", TONE[tone].text)}>{tone !== "off" && <Dot tone={tone} className="size-2" />}{v}</span>
                </li>
              ))}
            </ul>
            <div className="px-5 pt-1 pb-5">
              <Button variant="danger" className="w-full" disabled title="Làm ở lát 5"><Power />Ngừng nhận code · lát 5</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
