"use client";

const COLORS = ["#ffd24a", "#18d36a", "#ffffff", "#2f7dff", "#ff4d4d", "#b6ff3b"];

export function Celebrate({
  secPerItem,
  yieldRate,
  target,
  onClose,
}: {
  secPerItem: number;
  yieldRate: number;
  target: number;
  onClose: () => void;
}) {
  const bits = Array.from({ length: 52 }, (_, i) => ({
    id: i,
    left: `${(i * 17) % 100}%`,
    top: `${(i * 29) % 100}%`,
    delay: `${(i % 10) * 0.16}s`,
    color: COLORS[i % COLORS.length],
    dx: `${(i % 2 === 0 ? -1 : 1) * (18 + (i % 5) * 12)}px`,
    spin: `${180 + (i % 6) * 90}deg`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/80">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-void p-4">
        {bits.map((bit) => (
          <span
            key={bit.id}
            className="confetti-bit"
            style={{
              left: bit.left,
              top: bit.top,
              background: bit.color,
              animationDelay: bit.delay,
              ["--dx" as string]: bit.dx,
              ["--spin" as string]: bit.spin,
            }}
          />
        ))}
        <div className="pop-in relative m-auto w-full rounded-[28px] border-4 border-gold bg-[#10261a] p-5 shadow-[0_0_40px_#18d36a66]">
          <p className="text-center text-5xl font-black leading-tight text-gold">太優秀啦！⚡</p>
          <p className="mt-2 text-center text-xl font-black text-go">生產速度破紀錄</p>
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl bg-void px-4 py-4">
              <p className="text-sm font-bold text-muted">平均每件耗時</p>
              <p className="text-3xl font-black text-gold">
                {secPerItem.toFixed(1)} 秒
                <span className="ml-2 text-lg text-muted">（目標 {target} 秒）</span>
              </p>
            </div>
            <div className="rounded-2xl bg-void px-4 py-4">
              <p className="text-sm font-bold text-muted">良品率</p>
              <p className="text-3xl font-black text-go">{yieldRate}%</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 min-h-[72px] w-full rounded-2xl bg-go text-xl font-black text-void"
          >
            前往下一道工序 ➔
          </button>
        </div>
      </div>
    </div>
  );
}
