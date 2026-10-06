export type Holding = "run" | "pause" | null;

export type Run = {
  step: import("./types").ProcessStep;
  startMs: number;
  netMs: number;
  pauseMs: number;
  segmentStart: number | null;
  pauseStart: number | null;
  holding: Holding;
};

export function liveNet(run: Run, now: number) {
  return run.netMs + (run.segmentStart ? now - run.segmentStart : 0);
}

export function livePause(run: Run, now: number) {
  return run.pauseMs + (run.pauseStart ? now - run.pauseStart : 0);
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}小時${m}分${s}秒`;
  if (m) return `${m}分${s}秒`;
  return `${s}秒`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleString("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    hour12: false,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
