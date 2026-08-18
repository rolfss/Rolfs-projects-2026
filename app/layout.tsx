import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOARK 5 Arkivassistent",
  description:
    "RAG-basert chatassistent for norske arkivarer – spør om NOARK 5, arkivloven og arkivforskriften",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
