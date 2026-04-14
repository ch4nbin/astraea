import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Astraea",
  description: "Interview preparation for OOD and API interviews",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
