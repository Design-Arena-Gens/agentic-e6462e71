export const metadata = {
  title: "V?deo Engra?ado",
  description: "Gerador de v?deo engra?ado no navegador"
};

import "./globals.css";
import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  );
}
