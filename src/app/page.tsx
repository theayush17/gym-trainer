"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth-provider";
import { getAuthenticatedRedirectPath, getPlansRedirectReason } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const { user, profile, authLoading, profileLoading } = useAuthContext();
  const loading = authLoading || (Boolean(user) && profileLoading);

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("HomePage redirect timeout triggered.");
        if (!user) {
          router.replace("/register");
        } else {
          router.replace("/dashboard");
        }
      }
    }, 6000);

    if (loading) {
      return () => clearTimeout(safetyTimeout);
    }

    if (!user) {
      router.replace("/register");
    } else {
      const targetPath = getAuthenticatedRedirectPath(profile);
      const reason = getPlansRedirectReason(profile);
      router.replace(targetPath === "/plans" && reason ? `/plans?reason=${reason}` : targetPath);
    }

    return () => clearTimeout(safetyTimeout);
  }, [loading, profile, router, user]);

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
