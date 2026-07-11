import type { Metadata } from "next";
import "./globals.css";

import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "AGENTS",
  description: "Local AI Workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}