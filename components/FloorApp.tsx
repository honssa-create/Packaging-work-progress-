"use client";

import { useEffect, useState } from "react";
import { Celebrate } from "@/components/Celebrate";
import { QtyDialog } from "@/components/QtyDialog";
import { ORDERS, STEPS, findOrder } from "@/lib/orders";
import { speedLimit } from "@/lib/performance";
import type { Flavor, Order, PerformanceRating, ProcessStep, ProductionRecord } from "@/lib/types";
import { formatClock, formatTime, liveNet, livePause, type Run } from "@/lib/time";

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
  Object.fromEntries(order.flavors.map((flavor) => [flavor, { good: "", defect: "" }])) as QtyMap;

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
  const [cheer, setCheer] = useState<{ secPerItem: number } | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);

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
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [ticking]);

  if (!ready) return <main className="min-h-dvh bg-paper" />;

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
      current
        ? { ...current, orderNo: next.orderNo, step: "抹樽", done: [], run: null }
        : current,
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
        run: {
          ...run,
          netMs: liveNet(run, t),
          segmentStart: null,
          pauseStart: t,
        },
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
        run: {
          ...run,
          pauseMs: livePause(run, t),
          pauseStart: null,
          segmentStart: t,
        },
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

  function abandon() {
    setModal(false);
    setSession((current) => (current ? { ...current, run: null } : current));
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
        setCheer({ secPerItem: saved.secPerItem });
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

  if (!session) {
    return (
      <main className="flex min-h-dvh flex-col justify-between px-5 py-8">
        <div>
          <p className="text-xs font-bold tracking-[0.28em] text-moss">PACK LINE</p>
          <h1 className="mt-3 text-[2.6rem] leading-none font-black">
            包裝工序
            <br />
            追蹤
          </h1>
          <p className="mt-4 text-base leading-7 text-muted">返工後揀訂單，跟住抹樽、貼貼紙、包裝入箱。</p>
        </div>
        <form onSubmit={clockIn} className="space-y-3">
          <label className="block">
            <span className="text-sm font-bold">你的名字</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 40))}
              placeholder="例如：阿明"
              autoComplete="name"
              className="mt-2 h-14 w-full rounded-2xl border border-line bg-card px-4 text-lg outline-none focus:border-pine"
            />
          </label>
          <button
            type="submit"
            disabled={!name.trim()}
            className="min-h-16 w-full rounded-2xl bg-pine text-xl font-bold text-white disabled:opacity-40"
          >
            返工打卡
          </button>
          <a href="/records" className="block py-2 text-center text-sm font-bold text-moss">
            查看生產紀錄
          </a>
        </form>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-dvh px-4 pt-5 pb-8">
        <Header
          name={session.workerName}
          clockIn={session.clockIn}
          onClockOut={() => clockOut()}
        />
        <h1 className="mt-5 text-3xl font-black">選擇訂單</h1>
        <p className="mt-1 text-sm text-muted">ClickUp 示範訂單 · 25g / 45g 優秀線 5 秒 · 75g 為 7 秒</p>
        <ul className="mt-4 space-y-3">
          {ORDERS.map((item) => (
            <li key={item.orderNo}>
              <button
                type="button"
                onClick={() => selectOrder(item)}
                className="w-full rounded-3xl border border-line bg-card p-4 text-left active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xl font-black">{item.orderNo}</span>
                  <CapacityTag capacity={item.capacity} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {item.product} · 計劃 {item.planQty}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.flavors.map((flavor) => (
                    <FlavorChip key={flavor} flavor={flavor} />
                  ))}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const run = session.run;
  const running = Boolean(run?.segmentStart);
  const paused = Boolean(run?.pauseStart);
  const net = run ? liveNet(run, now) : 0;
  const pausedMs = run ? livePause(run, now) : 0;

  return (
    <main className="flex min-h-dvh flex-col px-4 pt-5 pb-6">
      <Header
        name={session.workerName}
        clockIn={session.clockIn}
        onClockOut={() => (run ? setConfirmOut(true) : clockOut())}
      />

      <section className="mt-4 rounded-3xl border border-line bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-black">{order.orderNo}</p>
            <p className="text-sm text-muted">
              {order.product} · 計劃 {order.planQty}
            </p>
          </div>
          <CapacityTag capacity={order.capacity} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {order.flavors.map((flavor) => (
            <FlavorChip key={flavor} flavor={flavor} />
          ))}
        </div>
        <p className="mt-3 text-sm font-semibold text-moss">優秀線 ≤ {speedLimit(order.capacity)} 秒/件（計淨工時）</p>
      </section>

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
                className={`flex min-h-14 w-full items-center justify-between rounded-2xl px-4 text-left text-base font-bold ${
                  active ? "bg-pine text-white" : "bg-card text-ink"
                }`}
              >
                <span>
                  {index + 1}. {step}
                </span>
                <span>{done ? "✓" : active ? "現在" : ""}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex flex-1 flex-col">
        {banner && <p className="mb-3 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">{banner}</p>}

        {!run && (
          <button type="button" onClick={startStep} className="min-h-20 w-full rounded-3xl bg-pine px-4 text-2xl leading-tight font-black text-white">
            開始{session.step}
          </button>
        )}

        {run && (
          <>
            <div className="text-center">
              <p className="text-sm font-bold text-muted">{running ? "淨工時計時中" : paused ? "已暫停" : "等待確認"}</p>
              <p className="mt-1 font-mono text-6xl font-black tracking-tight tabular-nums">{formatClock(net)}</p>
              <p className="mt-1 text-sm text-muted">暫停 {formatClock(pausedMs)}</p>
            </div>
            <div className="mt-auto space-y-3 pt-6">
              {running && (
                <button type="button" onClick={pause} className="min-h-16 w-full rounded-2xl bg-[#efe4d4] px-3 text-lg leading-snug font-bold">
                  暫停（食飯/補料/洗手間）
                </button>
              )}
              {paused && (
                <button type="button" onClick={resume} className="min-h-16 w-full rounded-2xl bg-moss text-lg font-bold text-white">
                  繼續工作
                </button>
              )}
              <button type="button" onClick={openComplete} className="min-h-16 w-full rounded-2xl bg-clay text-xl font-black text-white">
                完成{run.step}
              </button>
              <button type="button" onClick={abandon} className="w-full py-2 text-sm font-bold text-muted">
                放棄這道工序
              </button>
            </div>
          </>
        )}

        {!run && (
          <button type="button" onClick={() => setSession({ ...session, orderNo: null, run: null })} className="mt-auto py-3 text-sm font-bold text-moss">
            換一張訂單
          </button>
        )}
      </div>

      {modal && frozen && (
        <QtyDialog
          order={order}
          stepLabel={run?.step ?? session.step}
          netSeconds={Math.floor(frozen.netMs / 1000)}
          pausedSeconds={Math.floor(frozen.pauseMs / 1000)}
          qty={qty}
          busy={busy}
          error={error}
          onChange={(flavor, field, value) => setQty((current) => ({ ...current, [flavor]: { ...current[flavor], [field]: value } }))}
          onCancel={closeComplete}
          onSubmit={submit}
        />
      )}

      {cheer && <Celebrate secPerItem={cheer.secPerItem} onClose={() => setCheer(null)} />}

      {confirmOut && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45">
          <div className="w-full max-w-[430px] rounded-t-3xl bg-card p-5">
            <h2 className="text-xl font-black">工序尚未完成</h2>
            <p className="mt-2 text-sm text-muted">放工會放棄今次計時，不會寫入紀錄。</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirmOut(false)} className="min-h-14 rounded-2xl bg-paper font-bold">
                繼續做
              </button>
              <button type="button" onClick={clockOut} className="min-h-14 rounded-2xl bg-ink font-bold text-white">
                仍要放工
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Header({ name, clockIn, onClockOut }: { name: string; clockIn: string; onClockOut: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-black">{name}</p>
        <p className="text-xs text-muted">返工 {formatTime(clockIn)}</p>
      </div>
      <div className="flex items-center gap-2">
        <a href="/records" className="rounded-full bg-card px-3 py-2 text-sm font-bold">
          紀錄
        </a>
        <button type="button" onClick={onClockOut} className="min-h-11 rounded-full bg-ink px-4 text-sm font-bold text-white">
          放工打卡
        </button>
      </div>
    </div>
  );
}

function CapacityTag({ capacity }: { capacity: Order["capacity"] }) {
  const tone = capacity === "75g" ? "bg-rose-100 text-rose-900" : capacity === "45g" ? "bg-amber-100 text-amber-950" : "bg-emerald-100 text-emerald-900";
  return <span className={`rounded-full px-3 py-1 text-sm font-black ${tone}`}>{capacity}</span>;
}

function FlavorChip({ flavor }: { flavor: Flavor }) {
  const tone = flavor === "冰糖" ? "bg-amber-50 text-amber-900" : flavor === "桂花" ? "bg-lime-50 text-lime-900" : "bg-red-50 text-red-900";
  return <span className={`rounded-full px-3 py-1 text-sm font-bold ${tone}`}>{flavor}</span>;
}
