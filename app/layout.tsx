import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "사고은행 | Accidents Bank",
  description:
    "우리 동네의 안전 기록, 사고은행이 기억합니다. 전 세계 사건사고 데이터를 기록하고 AI로 탐색하세요.",
  keywords: ["사고", "안전", "지도", "카카오맵", "Accidents Bank"],
  openGraph: {
    title: "사고은행 | Accidents Bank",
    description: "우리 동네의 안전 기록, 사고은행이 기억합니다.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0ea5e9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
