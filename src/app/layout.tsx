import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "ProspectMap",
  description: "SaaS de prospección comercial B2B en mapa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
