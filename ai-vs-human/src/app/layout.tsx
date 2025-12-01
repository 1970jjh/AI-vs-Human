import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI vs Human - 72점 요새 전략",
  description: "AI가 최적의 위치에 숫자를 배치합니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans">{children}</body>
    </html>
  );
}
