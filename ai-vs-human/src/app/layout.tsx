import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI vs 집단지성 - JJ CREATIVE 교육연구소",
  description: "스트림스 보드게임 AI 챌린지",
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
