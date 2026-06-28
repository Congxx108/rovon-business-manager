import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROVON 经营管理系统",
  description: "订单、客户和每日潜客统计的轻量级经营管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
