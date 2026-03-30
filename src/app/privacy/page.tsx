"use client";

import { AppShell } from "@/components/app-shell";
import { useRouteProtection } from "@/hooks/use-route-protection";

export default function PrivacyPage() {
  const { loading, canRender } = useRouteProtection("authenticated");

  if (loading || !canRender) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="loading-card">Loading privacy policy...</div>
      </main>
    );
  }

  return (
    <AppShell title="Privacy Policy">
      <div className="panel-surface">
        <h2 className="heading-primary text-2xl font-bold">Privacy Policy</h2>
        <p className="text-muted mt-4 leading-7">
          We store only the information required to manage your account, body metrics, subscription status, and personalized content experience. This includes contact details, plan details, and training preferences. Sensitive account operations are handled through Firebase Authentication and Firestore access rules.
        </p>
      </div>
    </AppShell>
  );
}
