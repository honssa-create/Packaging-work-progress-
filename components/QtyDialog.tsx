"use client";

import { speedLimit, summarize } from "@/lib/performance";
import type { Flavor, Order } from "@/lib/types";
import { formatDuration } from "@/lib/time";

function bump(value: string, delta: number) {
  return String(Math.max(0, Math.min(99999, Number(value || 0) + delta)));
}

function Stepper({
  label,
  value,
  warn,
  onChange,
}: {
  label: string;
  value: string;
  warn?: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <div className={warn ? "rounded-2xl bg-[#3a1515] p-3" : ""}>
      <p className={`text-base font-black ${warn ? "text-danger" : "text-void"}`}>{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(bump(value, -1))}
          className="h-16 w-16 shrink-0 rounded-2xl bg-void text-3xl font-black text-ink"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={0}
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 5) || "0")}
          className={`h-16 min-w-0 flex-1 rounded-2xl border-2 bg-void text-center text-3xl font-black tabular-nums outline-none ${
            warn ? "border-danger text-danger" : "border-go text-ink"
          }`}
        />
        <button
          type="button"
          onClick={() => onChange(bump(value, 1))}
          className="h-16 w-16 shrink-0 rounded-2xl bg-go text-3xl font-black text-void"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function QtyDialog({
  order,
  stepLabel,
  netSeconds,
  pausedSeconds,
  qty,
  busy,
  error,
  onChange,
  onCancel,
  onSubmit,
}: {
  order: Order;
  stepLabel: string;
  netSeconds: number;
  pausedSeconds: number;
  qty: Partial<Record<Flavor, { good: string; defect: string }>>;
  busy: boolean;
  error: string;
  onChange: (flavor: Flavor, field: "good" | "defect", value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const details = order.flavors.map((flavor) => ({
    goodQty: Number(qty[flavor]?.good || 0),
    defectQty: Number(qty[flavor]?.defect || 0),
  }));
  const preview = summarize(order.capacity, netSeconds, details);
  const limit = speedLimit(order.capacity);
  const total = preview.totalGoodQty + preview.totalDefectQty;

  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-black/70">
      <form
        className="flex h-dvh w-full max-w-[430px] flex-col bg-void"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="text-sm font-bold text-muted">完成{stepLabel}</p>
            <h2 className="text-2xl font-black">填寫數量</h2>
          </div>
          <button type="button" onClick={onCancel} className="min-h-12 rounded-2xl bg-panel px-4 text-base font-black">
            返回
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-xl bg-gold px-3 py-1 text-lg font-black text-void">{order.orderNo}</span>
            <span className="rounded-xl bg-go px-3 py-1 text-lg font-black text-void">{order.capacity}</span>
          </div>
          <p className="mt-3 rounded-2xl bg-panel px-4 py-3 text-base font-bold">
            淨工時 {formatDuration(netSeconds)} · 暫停 {formatDuration(pausedSeconds)}
            <br />
            目標 ≤ {limit} 秒/件
            {total > 0 && (
              <>
                <br />
                預計 {preview.secPerItem.toFixed(1)} 秒/件 · 良品率 {preview.yieldRate}%
              </>
            )}
          </p>

          <div className="mt-4 space-y-3">
            {order.flavors.map((flavor) => (
              <article key={flavor} className="rounded-3xl bg-white p-4 text-void">
                <h3 className="text-2xl font-black">{flavor}</h3>
                <div className="mt-3 space-y-3">
                  <Stepper
                    label="良品"
                    value={qty[flavor]?.good ?? "0"}
                    onChange={(value) => onChange(flavor, "good", value)}
                  />
                  <Stepper
                    label="次品"
                    warn
                    value={qty[flavor]?.defect ?? "0"}
                    onChange={(value) => onChange(flavor, "defect", value)}
                  />
                </div>
              </article>
            ))}
          </div>
          {error && <p className="mt-3 text-base font-black text-danger">{error}</p>}
        </div>

        <div className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            disabled={busy || total === 0}
            className="min-h-[72px] w-full rounded-2xl bg-go text-2xl font-black text-void disabled:bg-line disabled:text-muted disabled:opacity-100"
          >
            {busy ? "提交中…" : "確認提交並結算"}
          </button>
        </div>
      </form>
    </div>
  );
}
