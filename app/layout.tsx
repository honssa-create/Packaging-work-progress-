import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "包裝工序追蹤",
  description: "工廠包裝工序打卡、數量與產能紀錄",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e3a2f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-paper shadow-2xl">{children}</div>
      </body>
    </html>
  );
}
