"use client";

import { Suspense } from "react";
import { useRouteProtection } from "@/hooks/use-route-protection";

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoader label="Checking your session..." />}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  useRouteProtection("home");

  return (
    <PageLoader label="Checking your session..." />
  );
}

function PageLoader({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="loading-card">{label}</div>
    </main>
  );
}
