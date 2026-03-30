"use client";

import { useRouteProtection } from "@/hooks/use-route-protection";

export default function HomePage() {
  useRouteProtection("home");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="loading-card">
        Checking your session...
      </div>
    </main>
  );
}
