"use client";

import { AppShell } from "@/components/app-shell";
import { useRouteProtection } from "@/hooks/use-route-protection";

export default function HelpPage() {
  const { loading, canRender } = useRouteProtection("authenticated");

  if (loading || !canRender) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="loading-card">Loading help page...</div>
      </main>
    );
  }

  return (
    <AppShell title="Help / Feedback">
      <div className="panel-surface">
        <h2 className="heading-primary text-2xl font-bold">Need Help?</h2>
        <p className="text-muted mt-4 leading-7">
          If you face any issue with your plan, profile, dashboard, or reminders, please contact the trainer through your preferred support channel. You can also share feedback about workouts, diet plans, and the overall app experience so the platform keeps improving.
        </p>
      </div>
    </AppShell>
  );
}
