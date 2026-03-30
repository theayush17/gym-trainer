"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getAuthenticatedRedirectPath, getPlansRedirectReason } from "@/lib/auth";
import { useAuthContext } from "@/components/auth-provider";

type GuardMode = "guest" | "plans" | "dashboard" | "home" | "authenticated";

export function useRouteProtection(mode: GuardMode) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authState = useAuthContext();
  const allowPlanUpgrade = searchParams.get("upgrade") === "1";
  const routeLoading =
    mode === "plans" || mode === "dashboard" || mode === "authenticated"
      ? authState.loading
      : authState.authLoading;

  useEffect(() => {
    if (routeLoading) {
      return;
    }

    if (mode === "home") {
      if (!authState.user) {
        router.replace("/register");
        return;
      }

      const targetPath = getAuthenticatedRedirectPath(authState.profile);
      const reason = getPlansRedirectReason(authState.profile);
      const destination = targetPath === "/plans" && reason ? `/plans?reason=${reason}` : targetPath;

      if (pathname !== destination) {
        router.replace(destination);
      }

      return;
    }

    if (mode === "guest") {
      if (!authState.user) {
        return;
      }

      const targetPath = getAuthenticatedRedirectPath(authState.profile);
      const reason = getPlansRedirectReason(authState.profile);
      router.replace(targetPath === "/plans" && reason ? `/plans?reason=${reason}` : targetPath);
      return;
    }

    if (!authState.user) {
      router.replace("/login");
      return;
    }

    if (mode === "authenticated") {
      return;
    }

    if (mode === "plans" && authState.subscriptionState === "active" && !allowPlanUpgrade) {
      router.replace("/dashboard");
      return;
    }

    if (mode === "dashboard" && authState.subscriptionState !== "active") {
      const destination =
        authState.subscriptionState === "expired" ? "/plans?reason=expired" : "/plans";

      router.replace(destination);
    }
  }, [allowPlanUpgrade, authState.profile, authState.subscriptionState, authState.user, mode, pathname, routeLoading, router]);

  const canRender =
    !routeLoading &&
    ((mode === "guest" && !authState.user) ||
      (mode === "plans" &&
        !!authState.user &&
        (authState.subscriptionState !== "active" || allowPlanUpgrade)) ||
      (mode === "dashboard" && !!authState.user && authState.subscriptionState === "active") ||
      (mode === "authenticated" && !!authState.user));

  return {
    ...authState,
    canRender
  };
}
