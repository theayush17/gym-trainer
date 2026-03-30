"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyAdminDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="loading-card">Redirecting to admin dashboard...</div>
    </main>
  );
}
