import React from "react";
import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "OpenGate ERP",
  description: "Enterprise Resource Planning for Iraqi Businesses",
};

import { LanguageProvider } from "@/contexts/LanguageContext";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className={`${manrope.variable} ${dmSans.variable}`}>
      <body>
        <LanguageProvider>
          <AppLayout>{children}</AppLayout>
        </LanguageProvider>
      </body>
    </html>
  );
}
