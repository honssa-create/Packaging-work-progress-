"use client";

import { speedLimit, summarize } from "@/lib/performance";
import type { Flavor, Order } from "@/lib/types";
import { formatDuration } from "@/lib/time";

const RATING_LABEL = { EXCELLENT: "太優秀", GOOD: "良好", NORMAL: "一般" };

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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45">
      <form
        className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-card px-5 pt-5 pb-6 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <p className="text-sm text-muted">完成{stepLabel}</p>
        <h2 className="mt-1 text-2xl font-black">填寫數量</h2>
        <p className="mt-1 text-sm text-muted">
          {order.orderNo} · {order.capacity} · 只顯示此單味道
        </p>
        <p className="mt-3 rounded-2xl bg-paper px-4 py-3 text-sm">
          淨工時 {formatDuration(netSeconds)} · 暫停 {formatDuration(pausedSeconds)}
          <br />
          優秀線 ≤ {limit} 秒/件
          {total > 0 && (
            <>
              {" "}
              · 預計 {preview.secPerItem.toFixed(2)} 秒/件 · {RATING_LABEL[preview.performanceRating]}
            </>
          )}
        </p>

        <div className="mt-4 space-y-3">
          {order.flavors.map((flavor) => (
            <fieldset key={flavor} className="rounded-2xl border border-line p-3">
              <legend className="px-1 text-lg font-bold">{flavor}</legend>
              <div className="grid grid-cols-2 gap-3">
                {(["good", "defect"] as const).map((field) => (
                  <label key={field} className="block">
                    <span className="text-sm text-muted">{field === "good" ? "良品" : "次品"}</span>
                    <input
                      inputMode="numeric"
                      value={qty[flavor]?.[field] ?? ""}
                      onChange={(event) => onChange(flavor, field, event.target.value.replace(/\D/g, "").slice(0, 5))}
                      className="mt-1 h-14 w-full rounded-xl border border-line bg-white text-center text-2xl font-bold outline-none focus:border-pine"
                      placeholder="0"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        {error && <p className="mt-3 text-sm font-medium text-clay">{error}</p>}

        <div className="mt-5 grid grid-cols-[0.7fr_1.3fr] gap-3">
          <button type="button" onClick={onCancel} className="min-h-14 rounded-2xl bg-paper text-lg font-bold">
            返回
          </button>
          <button
            type="submit"
            disabled={busy || total === 0}
            className="min-h-14 rounded-2xl bg-clay text-lg font-bold text-white disabled:opacity-40"
          >
            {busy ? "提交中…" : "確認提交"}
          </button>
        </div>
      </form>
    </div>
  );
}
