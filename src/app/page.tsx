import { Suspense } from "react";
import { HomeContent } from "@/components/home-content";
import { PageLoader } from "@/components/page-loader";

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoader label="Checking your session..." />}>
      <HomeContent />
    </Suspense>
  );
}
