"use client";

const COLORS = ["#f2c14e", "#d4531c", "#3f6b54", "#fffaf3", "#e23d3d", "#7dba6a"];

export function Celebrate({
  secPerItem,
  onClose,
}: {
  secPerItem: number;
  onClose: () => void;
}) {
  const bits = Array.from({ length: 48 }, (_, i) => ({
    id: i,
    left: `${(i * 17) % 100}%`,
    top: `${(i * 29) % 100}%`,
    delay: `${(i % 10) * 0.18}s`,
    color: COLORS[i % COLORS.length],
    dx: `${(i % 2 === 0 ? -1 : 1) * (16 + (i % 5) * 14)}px`,
    spin: `${180 + (i % 6) * 90}deg`,
    tilt: `${(i % 8) * 20 - 40}deg`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-pine">
      <div className="relative flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center overflow-hidden px-6 text-center text-white">
      {bits.map((bit) => (
        <span
          key={bit.id}
          className="confetti-bit"
          style={{
            left: bit.left,
            top: bit.top,
            background: bit.color,
            transform: `rotate(${bit.tilt})`,
            animationDelay: bit.delay,
            ["--dx" as string]: bit.dx,
            ["--spin" as string]: bit.spin,
          }}
        />
      ))}
      <div className="pop-in relative">
        <p className="text-5xl font-black leading-tight text-white">太優秀啦！</p>
        <p className="mt-4 text-2xl font-bold text-white">⚡ 生產速度破紀錄！</p>
        <p className="mt-6 text-lg text-white/80">{secPerItem.toFixed(2)} 秒/件</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-10 min-h-16 w-full rounded-2xl bg-white px-8 text-xl font-bold text-pine"
        >
          繼續
        </button>
      </div>
      </div>
    </div>
  );
}
