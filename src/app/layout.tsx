import type { Metadata } from "next";
import Script from "next/script";
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
    <html lang="en" className="h-full max-w-full overflow-x-hidden" suppressHydrationWarning>
      <body className="min-h-screen max-w-full overflow-x-hidden">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const savedTheme = localStorage.getItem("theme") || localStorage.getItem("gym-theme");
              const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              const theme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : (prefersDark ? "dark" : "light");
              document.documentElement.classList.toggle("dark", theme === "dark");
            } catch {
              document.documentElement.classList.remove("dark");
            }
          })();`}
        </Script>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />
        <ThemeProvider>
          <SecurityGuard />
          <AppToaster />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
