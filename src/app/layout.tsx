import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MakaLearn",
  description: "Classroom learning materials, guided practice, and activities in one place."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
