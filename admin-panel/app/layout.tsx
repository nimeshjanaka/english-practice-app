import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Speakora Content Studio",
  description: "English curriculum content management",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
