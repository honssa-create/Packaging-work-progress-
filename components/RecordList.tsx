import { HeaderBar } from "@/components/HeaderBar";
import type { ProductionRecord } from "@/lib/types";
import { formatDuration, formatTime } from "@/lib/time";

const RATING = {
  EXCELLENT: "bg-gold text-void",
  GOOD: "bg-go text-void",
  NORMAL: "bg-line text-ink",
};

const RATING_LABEL = { EXCELLENT: "太優秀", GOOD: "良好", NORMAL: "一般" };

export function RecordList({
  records,
  best,
  query,
}: {
  records: ProductionRecord[];
  best: { step: string; record?: ProductionRecord }[];
  query: string;
}) {
  return (
    <main className="min-h-dvh bg-void pb-8">
      <HeaderBar
        name="紀錄榜"
        right={
          <a href="/" className="inline-flex min-h-10 items-center rounded-full bg-go px-4 text-sm font-black text-void">
            返回車間
          </a>
        }
      />

      <section className="px-4 pt-4">
        <h1 className="text-3xl font-black">最佳紀錄</h1>
        <p className="mt-1 text-base font-bold text-muted">以淨工時每件秒數排名</p>
        <ul className="mt-3 space-y-2">
          {best.map(({ step, record }, index) => (
            <li key={step} className="rounded-3xl border border-gold/40 bg-panel p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-black">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"} {step}
                </p>
                {record ? (
                  <span className="rounded-full bg-gold px-3 py-1 text-sm font-black text-void">
                    {record.secPerItem.toFixed(2)} 秒/件
                  </span>
                ) : (
                  <span className="text-sm font-bold text-muted">暫無</span>
                )}
              </div>
              {record && (
                <p className="mt-2 text-base font-bold">
                  {record.workerName} · {record.orderNo} · {record.capacity} · 良品率 {record.yieldRate}%
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="px-4 pt-6">
        <h2 className="text-2xl font-black">全部紀錄</h2>
        <form className="mt-3" action="/records">
          <input
            name="q"
            defaultValue={query}
            placeholder="搜尋單號、員工、工序"
            className="h-14 w-full rounded-2xl border border-line bg-panel px-4 text-base outline-none"
          />
        </form>
        {records.length === 0 ? (
          <p className="mt-12 text-center text-lg font-bold text-muted">尚未有生產紀錄</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {records.map((record) => (
              <li key={record.recordId} className="rounded-3xl bg-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-black">
                      {record.orderNo}
                      <span className="ml-2 rounded-lg bg-gold px-2 py-0.5 text-sm font-black text-void">
                        {record.capacity}
                      </span>
                    </p>
                    <p className="mt-1 text-base font-bold">
                      {record.processStep} · {record.workerName}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-black ${RATING[record.performanceRating]}`}>
                    {RATING_LABEL[record.performanceRating]}
                  </span>
                </div>
                <p className="mt-3 text-base font-bold">
                  {record.netDurationSeconds > 0
                    ? `${record.secPerItem.toFixed(2)} 秒/件 · ${record.itemsPerHour} 件/時`
                    : "工時不足 1 秒"}
                </p>
                <p className="text-sm font-bold text-muted">
                  淨工時 {formatDuration(record.netDurationSeconds)} · 暫停 {formatDuration(record.pausedDurationSeconds)}
                </p>
                <p className="text-sm font-bold text-muted">{formatTime(record.startTime)}</p>
                <p className="mt-2 text-base font-black">
                  良品 {record.totalGoodQty} · 次品 {record.totalDefectQty} · {record.yieldRate}%
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {record.details.map((detail) => (
                    <li key={detail.flavor} className="rounded-xl bg-void px-3 py-2 text-sm font-bold">
                      {detail.flavor} 良 {detail.goodQty} / 次 {detail.defectQty}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
