import type { PerformanceRating, ProductionRecord } from "@/lib/types";
import { formatDuration, formatTime } from "@/lib/time";

const RATING: Record<PerformanceRating, string> = {
  EXCELLENT: "bg-amber-200 text-amber-950",
  GOOD: "bg-emerald-100 text-emerald-900",
  NORMAL: "bg-stone-200 text-stone-700",
};

const RATING_LABEL: Record<PerformanceRating, string> = {
  EXCELLENT: "太優秀",
  GOOD: "良好",
  NORMAL: "一般",
};

export function RecordList({ records, query }: { records: ProductionRecord[]; query: string }) {
  return (
    <main className="min-h-dvh px-4 pt-5 pb-8">
      <div className="flex items-center justify-between">
        <a href="/" className="text-sm font-bold text-moss">
          ← 返回車間
        </a>
        <a href="/records" className="text-sm font-bold text-muted">
          重新整理
        </a>
      </div>
      <h1 className="mt-3 text-3xl font-black">生產紀錄</h1>
      <p className="mt-1 text-sm text-muted">每次完成工序的完整紀錄 · {records.length} 筆</p>

      <form className="mt-4" action="/records">
        <input
          name="q"
          defaultValue={query}
          placeholder="搜尋單號、員工、工序"
          className="h-12 w-full rounded-2xl border border-line bg-card px-4 outline-none focus:border-pine"
        />
      </form>

      {records.length === 0 ? (
        <p className="mt-16 text-center text-muted">尚未有生產紀錄</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {records.map((record) => (
            <li key={record.recordId} className="rounded-3xl border border-line bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black">
                    {record.orderNo}
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-900">
                      {record.capacity}
                    </span>
                  </p>
                  <p className="mt-1 text-sm">
                    {record.processStep} · {record.workerName}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${RATING[record.performanceRating]}`}>
                  {RATING_LABEL[record.performanceRating]}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted">
                {formatTime(record.startTime)} → {formatTime(record.endTime)}
              </p>
              <p className="mt-1 text-sm">
                淨工時 {formatDuration(record.netDurationSeconds)} · 暫停 {formatDuration(record.pausedDurationSeconds)}
              </p>
              <p className="mt-2 text-sm font-semibold">
                良品 {record.totalGoodQty} · 次品 {record.totalDefectQty} · 良品率 {record.yieldRate}%
              </p>
              <p className="text-sm font-semibold">
                {record.netDurationSeconds > 0
                  ? `${record.secPerItem.toFixed(2)} 秒/件 · ${record.itemsPerHour} 件/時`
                  : "工時不足 1 秒"}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {record.details.map((detail) => (
                  <li key={detail.flavor} className="rounded-xl bg-paper px-3 py-2 text-sm">
                    {detail.flavor} 良 {detail.goodQty} / 次 {detail.defectQty}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
