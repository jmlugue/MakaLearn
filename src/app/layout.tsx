import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MakaLearn",
  description: "Teacher-guided Makaton learning support"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
