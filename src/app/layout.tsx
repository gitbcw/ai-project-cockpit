import type { Metadata } from "next";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Project Cockpit",
  description: "自用的 AI-native 产品研发项目驾驶舱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
