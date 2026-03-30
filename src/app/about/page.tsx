"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { useRouteProtection } from "@/hooks/use-route-protection";

export default function AboutPage() {
  return (
    <Suspense fallback={<LoadingPage label="Loading About Us..." />}>
      <AboutPageContent />
    </Suspense>
  );
}

function AboutPageContent() {
  const { loading, canRender } = useRouteProtection("authenticated");

  if (loading || !canRender) {
    return <LoadingPage label="Loading About Us..." />;
  }

  return (
    <AppShell title="About Us">
      <StaticCard
        title="About Gym Trainer App"
        text="Gym Trainer App helps members follow a guided training journey with day-wise workouts, diet plans, and expert tips. The platform is built to be simple for users and practical for trainers managing subscriptions and content."
      />
    </AppShell>
  );
}

function StaticCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="panel-surface">
      <h2 className="heading-primary text-2xl font-bold">{title}</h2>
      <p className="text-muted mt-4 leading-7">{text}</p>
    </div>
  );
}

function LoadingPage({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="loading-card">{label}</div>
    </main>
  );
}
