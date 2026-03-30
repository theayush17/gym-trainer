"use client";

import { useRouteProtection } from "@/hooks/use-route-protection";
import { PageLoader } from "@/components/page-loader";

export function HomeContent() {
  const { canRender } = useRouteProtection("home");

  if (!canRender) {
    return <PageLoader label="Checking your session..." />;
  }

  // home mode always redirects, so this part should technically not be visible for long
  return <PageLoader label="Redirecting..." />;
}
