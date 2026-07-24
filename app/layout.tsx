import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "LegendX｜由學識，到成就別人",
    template: "%s｜LegendX",
  },
  description:
    "LegendX 三階段專業進階課程，將學習、實踐與傳承連成一條清晰路線。",
  openGraph: {
    title: "LegendX｜由學識，到成就別人",
    description:
      "三階段專業進階課程，將學習、實踐與傳承連成一條清晰路線。",
    locale: "zh_HK",
    type: "website",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: "#071827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK">
      <body>{children}</body>
    </html>
  );
}
