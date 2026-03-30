"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAdminRole, isTrainerEmail } from "@/lib/admin";
import { getAuthenticatedRedirectPath, getPlansRedirectReason } from "@/lib/auth";
import { useAuthContext } from "@/components/auth-provider";

type AdminMode = "guest" | "protected";

export function useAdminProtection(mode: AdminMode) {
  const router = useRouter();
  const authState = useAuthContext();
  const isAdmin = isAdminRole(authState.profile?.role) || isTrainerEmail(authState.user?.email);
  const authResolved = !authState.authLoading;

  useEffect(() => {
    if (!authResolved) {
      return;
    }

    if (mode === "guest") {
      if (!authState.user) {
        return;
      }

      if (isAdmin) {
        router.replace("/admin/dashboard");
        return;
      }

      const path = getAuthenticatedRedirectPath(authState.profile);
      const reason = getPlansRedirectReason(authState.profile);
      router.replace(path === "/plans" && reason ? `/plans?reason=${reason}` : path);
      return;
    }

    if (!authState.user) {
      router.replace("/admin/login");
      return;
    }

    if (!isAdmin) {
      const path = getAuthenticatedRedirectPath(authState.profile);
      const reason = getPlansRedirectReason(authState.profile);
      router.replace(path === "/plans" && reason ? `/plans?reason=${reason}` : path);
    }
  }, [authResolved, authState.profile, authState.user, isAdmin, mode, router]);

  const canRender =
    authResolved && ((mode === "guest" && !authState.user) || (mode === "protected" && !!authState.user && isAdmin));

  return {
    ...authState,
    authResolved,
    isAdmin,
    canRender
  };
}
