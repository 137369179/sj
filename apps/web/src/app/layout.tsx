import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "市集招募平台",
    template: "%s | 市集招募平台"
  },
  description: "让市集招募、报名、审核与摊位管理更高效。",
  icons: {
    icon: ["/favicon.ico", "/favicon.svg"]
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
