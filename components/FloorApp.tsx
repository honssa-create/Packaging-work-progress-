"use client";

import { useEffect, useState } from "react";
import { Celebrate } from "@/components/Celebrate";
import { HeaderBar } from "@/components/HeaderBar";
import { QtyDialog } from "@/components/QtyDialog";
import { bestFor } from "@/lib/best";
import { ORDERS, STEPS, findOrder } from "@/lib/orders";
import { speedLimit } from "@/lib/performance";
import type { Flavor, Order, PerformanceRating, ProcessStep, ProductionRecord } from "@/lib/types";
import { formatClock, liveNet, livePause, type Run } from "@/lib/time";

const KEY = "floor-session";

type QtyMap = Record<Flavor, { good: string; defect: string }>;
type Frozen = { startMs: number; endMs: number; netMs: number; pauseMs: number };
type Session = {
  workerId: string;
  workerName: string;
  clockIn: string;
  orderNo: string | null;
  step: ProcessStep;
  done: ProcessStep[];
  run: Run | null;
};

const RATING_LABEL: Record<PerformanceRating, string> = {
  EXCELLENT: "太優秀",
  GOOD: "良好",
  NORMAL: "一般",
};

const emptyQty = (order: Order): QtyMap =>
  Object.fromEntries(order.flavors.map((flavor) => [flavor, { good: "0", defect: "0" }])) as QtyMap;

export function FloorApp() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [name, setName] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [modal, setModal] = useState(false);
  const [frozen, setFrozen] = useState<Frozen | null>(null);
  const [qty, setQty] = useState<QtyMap>({} as QtyMap);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const [cheer, setCheer] = useState<{ secPerItem: number; yieldRate: number; target: number } | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [board, setBoard] = useState<ProductionRecord[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw) as Session);
      } catch {
        localStorage.removeItem(KEY);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  }, [ready, session]);

  const ticking = Boolean(session?.run && (session.run.segmentStart || session.run.pauseStart));
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), ticking ? 250 : 1000);
    return () => clearInterval(id);
  }, [session, ticking]);

  useEffect(() => {
    fetch("/api/records")
      .then((res) => res.json())
      .then((rows: ProductionRecord[]) => setBoard(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, [cheer, banner]);

  if (!ready) return <main className="min-h-dvh bg-void" />;

  const order = session?.orderNo ? findOrder(session.orderNo) : undefined;

  function clockIn(event: React.FormEvent) {
    event.preventDefault();
    const workerName = name.trim();
    if (!workerName) return;
    setSession({
      workerId: `W-${crypto.randomUUID().slice(0, 8)}`,
      workerName,
      clockIn: new Date().toISOString(),
      orderNo: null,
      step: "抹樽",
      done: [],
      run: null,
    });
  }

  function clockOut() {
    setConfirmOut(false);
    setModal(false);
    setSession(null);
    setName("");
    setBanner("");
  }

  function selectOrder(next: Order) {
    setBanner("");
    setSession((current) =>
      current ? { ...current, orderNo: next.orderNo, step: "抹樽", done: [], run: null } : current,
    );
  }

  function pickStep(step: ProcessStep) {
    if (session?.run) return;
    setSession((current) => (current ? { ...current, step } : current));
  }

  function startStep() {
    if (!session) return;
    const t = Date.now();
    setBanner("");
    setSession({
      ...session,
      run: {
        step: session.step,
        startMs: t,
        netMs: 0,
        pauseMs: 0,
        segmentStart: t,
        pauseStart: null,
        holding: null,
      },
    });
    setNow(t);
  }

  function pause() {
    const t = Date.now();
    setSession((current) => {
      const run = current?.run;
      if (!current || !run?.segmentStart) return current;
      return {
        ...current,
        run: { ...run, netMs: liveNet(run, t), segmentStart: null, pauseStart: t },
      };
    });
    setNow(t);
  }

  function resume() {
    const t = Date.now();
    setSession((current) => {
      const run = current?.run;
      if (!current || !run?.pauseStart) return current;
      return {
        ...current,
        run: { ...run, pauseMs: livePause(run, t), pauseStart: null, segmentStart: t },
      };
    });
    setNow(t);
  }

  function openComplete() {
    if (!session?.run || !order) return;
    const t = Date.now();
    const run = session.run;
    const snap = { startMs: run.startMs, endMs: t, netMs: liveNet(run, t), pauseMs: livePause(run, t) };
    setFrozen(snap);
    setQty(emptyQty(order));
    setError("");
    setModal(true);
    setSession({
      ...session,
      run: {
        ...run,
        netMs: snap.netMs,
        pauseMs: snap.pauseMs,
        segmentStart: null,
        pauseStart: null,
        holding: run.segmentStart ? "run" : "pause",
      },
    });
  }

  function closeComplete() {
    const t = Date.now();
    setModal(false);
    setError("");
    setSession((current) => {
      const run = current?.run;
      if (!current || !run) return current;
      return {
        ...current,
        run: {
          ...run,
          holding: null,
          segmentStart: run.holding === "run" ? t : null,
          pauseStart: run.holding === "pause" ? t : null,
        },
      };
    });
  }

  async function submit() {
    if (!session?.run || !order || !frozen) return;
    const details = order.flavors.map((flavor) => ({
      flavor,
      goodQty: Number(qty[flavor]?.good || 0),
      defectQty: Number(qty[flavor]?.defect || 0),
    }));
    const draft: ProductionRecord = {
      recordId: crypto.randomUUID(),
      workerId: session.workerId,
      workerName: session.workerName,
      orderNo: order.orderNo,
      capacity: order.capacity,
      processStep: session.run.step,
      startTime: new Date(frozen.startMs).toISOString(),
      endTime: new Date(frozen.endMs).toISOString(),
      netDurationSeconds: Math.floor(frozen.netMs / 1000),
      pausedDurationSeconds: Math.floor(frozen.pauseMs / 1000),
      details,
      totalGoodQty: 0,
      totalDefectQty: 0,
      yieldRate: 0,
      secPerItem: 0,
      itemsPerHour: 0,
      performanceRating: "NORMAL",
    };

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const saved = (await res.json()) as ProductionRecord & { error?: string };
      if (!res.ok) {
        setError(saved.error || "儲存失敗");
        return;
      }
      const finished = session.run.step;
      const done = session.done.includes(finished) ? session.done : [...session.done, finished];
      const next = STEPS.find((step) => !done.includes(step)) ?? finished;
      setSession({ ...session, done, step: next, run: null });
      setModal(false);
      if (saved.performanceRating === "EXCELLENT") {
        navigator.vibrate?.([30, 40, 30]);
        setCheer({
          secPerItem: saved.secPerItem,
          yieldRate: saved.yieldRate,
          target: speedLimit(order.capacity),
        });
        setBanner("");
      } else {
        setBanner(`已記錄 ${finished} · ${saved.secPerItem.toFixed(2)} 秒/件 · ${RATING_LABEL[saved.performanceRating]}`);
      }
    } catch {
      setError("網絡錯誤，請再試一次");
    } finally {
      setBusy(false);
    }
  }

  const nav = session ? (
    <div className="flex gap-2">
      <a href="/records" className="inline-flex min-h-10 items-center rounded-full bg-gold px-4 text-sm font-black text-void">
        紀錄榜
      </a>
      <button
        type="button"
        onClick={() => (session.run ? setConfirmOut(true) : clockOut())}
        className="min-h-10 rounded-full bg-danger px-4 text-sm font-black text-white"
      >
        放工
      </button>
    </div>
  ) : (
    <a href="/records" className="inline-flex min-h-10 items-center rounded-full bg-gold px-4 text-sm font-black text-void">
      紀錄榜
    </a>
  );

  if (!session) {
    return (
      <main className="flex min-h-dvh flex-col bg-void">
        <HeaderBar name="PACK LINE" right={nav} />
        <div className="flex flex-1 flex-col justify-between px-5 py-8">
          <div>
            <p className="text-sm font-black tracking-[0.35em] text-go">LIVE SHIFT</p>
            <h1 className="mt-3 text-5xl leading-none font-black text-gold">
              包裝
              <br />
              挑戰
            </h1>
            <p className="mt-4 text-lg font-bold leading-7 text-muted">打卡開波，揀單，打破每件秒數紀錄。</p>
          </div>
          <form onSubmit={clockIn} className="space-y-3">
            <label className="block">
              <span className="text-base font-black">你的名字</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 40))}
                placeholder="例如：阿明"
                autoComplete="name"
                className="mt-2 h-16 w-full rounded-2xl border-2 border-line bg-panel px-4 text-xl font-bold outline-none focus:border-go"
              />
            </label>
            <button
              type="submit"
              disabled={!name.trim()}
              className="min-h-[72px] w-full rounded-2xl bg-go text-2xl font-black text-void disabled:opacity-40"
            >
              返工打卡
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-dvh bg-void pb-8">
        <HeaderBar name={session.workerName} right={nav} />
        <div className="px-4 pt-5">
          <h1 className="text-3xl font-black">選擇關卡</h1>
          <p className="mt-1 text-base font-bold text-muted">25g / 45g 目標 5 秒 · 75g 目標 7 秒</p>
          <ul className="mt-4 space-y-3">
            {ORDERS.map((item) => (
              <li key={item.orderNo}>
                <button
                  type="button"
                  onClick={() => selectOrder(item)}
                  className="w-full rounded-3xl bg-panel p-4 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-gold px-3 py-1 text-lg font-black text-void">{item.orderNo}</span>
                    <span className="rounded-xl bg-go px-3 py-1 text-lg font-black text-void">{item.capacity}</span>
                  </div>
                  <p className="mt-2 text-base font-bold text-muted">
                    {item.product} · 計劃 {item.planQty}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.flavors.map((flavor) => (
                      <span key={flavor} className="rounded-full bg-void px-3 py-1 text-sm font-black">
                        {flavor}
                      </span>
                    ))}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  const run = session.run;
  const running = Boolean(run?.segmentStart);
  const paused = Boolean(run?.pauseStart);
  const net = run ? liveNet(run, now) : 0;
  const pausedMs = run ? livePause(run, now) : 0;
  const best = bestFor(board, run?.step ?? session.step, order.capacity);
  const title = run ? `${run.step}中` : session.step;
  const status = running ? "進行中" : paused ? "已暫停" : "準備開始";

  return (
    <main className={`min-h-dvh bg-void ${run ? "pb-[120px]" : "pb-8"}`}>
      <HeaderBar name={session.workerName} right={nav} />

      <section className={`px-4 pt-4 ${run ? "" : "flex min-h-[calc(100dvh-92px)] flex-col"}`}>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-xl bg-gold px-3 py-1.5 text-xl font-black text-void">{order.orderNo}</span>
          <span className="rounded-xl bg-go px-3 py-1.5 text-xl font-black text-void">{order.capacity}</span>
        </div>
        <p className="mt-2 text-base font-bold text-muted">
          {order.product} · {order.flavors.join(" / ")}
        </p>
        <p className="mt-1 text-base font-black text-gold">
          目標 {speedLimit(order.capacity)} 秒/件
          {best ? ` · 最佳 ${best.secPerItem.toFixed(2)}` : " · 挑戰第一名"}
        </p>

        <div className="mt-5 text-center">
          <p className="text-5xl leading-none font-black">{title}</p>
          <span
            className={`mt-3 inline-flex min-h-10 items-center rounded-full px-4 text-base font-black ${
              running ? "bg-go text-void" : paused ? "bg-pause text-void" : "bg-panel text-ink"
            }`}
          >
            {running && <span className="live-dot mr-2 h-2.5 w-2.5 rounded-full bg-void" />}
            {status}
          </span>
        </div>

        {run && (
          <div className="mt-6 rounded-[28px] border-2 border-go bg-panel px-3 py-6 text-center">
            <p className="text-sm font-black tracking-[0.3em] text-muted">NET TIME</p>
            <p className="mt-1 font-mono text-5xl font-black tracking-tight tabular-nums">{formatClock(net)}</p>
            <p className="mt-3 text-base font-bold text-pause">暫停 {formatClock(pausedMs)}</p>
            <p className="mt-2 text-base font-black text-gold">
              目標 {speedLimit(order.capacity)} 秒/件
              {best ? ` · 最佳 ${best.secPerItem.toFixed(2)}` : " · 挑戰第一名"}
            </p>
          </div>
        )}

        {banner && <p className="mt-4 rounded-2xl bg-go px-4 py-3 text-base font-black text-void">{banner}</p>}

        {!run && (
          <div className="flex flex-1 items-center justify-center py-4">
            <button
              type="button"
              onClick={startStep}
              className="flex h-60 w-60 flex-col items-center justify-center rounded-full bg-go px-5 text-center leading-tight font-black text-void shadow-[0_0_56px_#18d36a99]"
            >
              <span className="text-4xl">開始</span>
              <span className="mt-1 text-2xl">{session.step}</span>
            </button>
          </div>
        )}

        {!run && (
          <div className="mt-4 space-y-2">
            {STEPS.map((step, index) => {
              const active = session.step === step;
              const done = session.done.includes(step);
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => pickStep(step)}
                  className={`flex min-h-16 w-full items-center justify-between rounded-2xl px-4 text-left text-lg font-black ${
                    active ? "bg-go text-void" : "bg-panel"
                  }`}
                >
                  <span>
                    {index + 1}. {step}
                  </span>
                  <span>{done ? "CLEAR" : active ? "NOW" : ""}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSession({ ...session, orderNo: null, run: null })}
              className="w-full py-3 text-base font-black text-muted"
            >
              換一張訂單
            </button>
          </div>
        )}
      </section>

      {run && (
      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-line bg-void p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {running && (
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={pause} className="col-span-1 min-h-[72px] rounded-2xl bg-pause px-2 text-lg font-black text-void">
              暫停
            </button>
            <button type="button" onClick={openComplete} className="col-span-2 min-h-[72px] rounded-2xl bg-go text-xl font-black text-void">
              完成工序
            </button>
          </div>
        )}
        {paused && (
          <button type="button" onClick={resume} className="min-h-[72px] w-full rounded-2xl bg-resume text-2xl font-black text-white">
            繼續工作
          </button>
        )}
        {run && !running && !paused && (
          <button type="button" onClick={openComplete} className="min-h-[72px] w-full rounded-2xl bg-go text-xl font-black text-void">
            完成工序
          </button>
        )}
      </div>
      )}

      {modal && frozen && (
        <QtyDialog
          order={order}
          stepLabel={run?.step ?? session.step}
          netSeconds={Math.floor(frozen.netMs / 1000)}
          pausedSeconds={Math.floor(frozen.pauseMs / 1000)}
          qty={qty}
          busy={busy}
          error={error}
          onChange={(flavor, field, value) =>
            setQty((current) => ({ ...current, [flavor]: { ...current[flavor], [field]: value } }))
          }
          onCancel={closeComplete}
          onSubmit={submit}
        />
      )}

      {cheer && (
        <Celebrate
          secPerItem={cheer.secPerItem}
          yieldRate={cheer.yieldRate}
          target={cheer.target}
          onClose={() => setCheer(null)}
        />
      )}

      {confirmOut && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70">
          <div className="w-full max-w-[430px] rounded-t-3xl bg-panel p-5">
            <h2 className="text-2xl font-black">工序尚未完成</h2>
            <p className="mt-2 text-base font-bold text-muted">放工會放棄今次計時。</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirmOut(false)} className="min-h-16 rounded-2xl bg-go font-black text-void">
                繼續做
              </button>
              <button type="button" onClick={clockOut} className="min-h-16 rounded-2xl bg-danger font-black text-white">
                仍要放工
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
