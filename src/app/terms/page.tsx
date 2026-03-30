"use client";

import { AppShell } from "@/components/app-shell";
import { useRouteProtection } from "@/hooks/use-route-protection";

export default function TermsPage() {
  const { loading, canRender } = useRouteProtection("authenticated");

  if (loading || !canRender) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="loading-card">Loading terms...</div>
      </main>
    );
  }

  return (
    <AppShell title="Terms & Conditions">
      <div className="panel-surface">
        <h2 className="heading-primary text-2xl font-bold">Terms & Conditions</h2>
        <p className="text-muted mt-4 leading-7">
          This app is intended for educational and training support purposes. Members are responsible for following professional advice, using the platform appropriately, and maintaining the confidentiality of their login details. Subscription access is limited by plan level, renewal period, and available content schedule.
        </p>
      </div>
    </AppShell>
  );
}
