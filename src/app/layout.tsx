import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { AppToaster } from "@/components/app-toaster";
import { SecurityGuard } from "@/components/security-guard";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Gym Trainer",
  description: "Subscription-based gym trainer web application"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SecurityGuard />
          <AppToaster />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
