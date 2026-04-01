import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MapStyleProvider } from "@/components/MapStyleProvider";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "The Editorial Ledger | TrueCost Rent",
  description: "High-end real estate analytics experience for verified rental data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-surface">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className={`${inter.className} bg-surface text-on-surface antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MapStyleProvider>
            <QueryProvider>{children}</QueryProvider>
          </MapStyleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
