"use client";

import { useEffect, useState } from "react";

export function HeaderBar({
  name,
  right,
}: {
  name: string;
  right?: React.ReactNode;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      clearInterval(tick);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const clock = new Date(now).toLocaleTimeString("zh-HK", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Hong_Kong",
  });

  return (
    <header className="border-b border-line bg-panel px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xl font-black">{name}</p>
        <p className="font-mono text-xl font-black tabular-nums">{clock}</p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={`inline-flex min-h-8 items-center rounded-full px-3 text-sm font-black ${
            online ? "bg-go text-void" : "bg-danger text-white"
          }`}
        >
          <span className={`mr-1.5 h-2.5 w-2.5 rounded-full bg-current ${online ? "live-dot" : ""}`} />
          {online ? "在線" : "離線"}
        </span>
        {right}
      </div>
    </header>
  );
}
