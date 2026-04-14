import type { Metadata } from "next";
import "./globals.css";
import { AstraeaChatbot } from "@/components/chatbot/astraea-chatbot";

export const metadata: Metadata = {
  title: "Astraea",
  description: "Interview preparation for OOD and API interviews",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <AstraeaChatbot />
      </body>
    </html>
  );
}
