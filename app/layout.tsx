import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oido Absoluto Arcade",
  description: "Adivina la nota y mejora tu oido musical jugando.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
