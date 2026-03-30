"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { getPlanLevelFromPlanId, PLANS } from "@/lib/plans";
import { useRouteProtection } from "@/hooks/use-route-protection";
import { useSearchParams } from "next/navigation";
import { dismissToast, notifyError, notifyLoading, notifySuccess, notifyWarning } from "@/lib/toast";

export default function PlansPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingPlanId, setLoadingPlanId] = useState("");
  const { user, profile, loading, canRender, refreshProfile, subscriptionState } = useRouteProtection("plans");
  const isExpiredFlow = searchParams.get("reason") === "expired" || subscriptionState === "expired";
  const currentPlanId = profile?.subscription?.planId || "";
  const currentPlanLevel = profile?.subscription?.planLevel || getPlanLevelFromPlanId(currentPlanId);

  const handleSubscribe = async (planId: string) => {
    if (!user?.uid) {
      notifyWarning("Please login first");
      router.replace("/login");
      return;
    }

    setLoadingPlanId(planId);
    const loadingToast = notifyLoading("Activating subscription...");

    try {
      const { doc, setDoc } = await import("firebase/firestore");

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      await setDoc(
        doc(db, "users", user.uid),
        {
          subscription: {
            planId,
            planLevel: PLANS.find((plan) => plan.id === planId)?.level ?? 0,
            status: "active",
            expiry: expiryDate.toISOString(),
            subscriptionStartDate: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      await refreshProfile();

      console.log("Subscription updated for UID:", user.uid, "Plan:", planId);
      dismissToast(loadingToast);
      notifySuccess("Subscription activated successfully");
      router.replace("/dashboard");
    } catch (error) {
      console.error("Subscription error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Subscription failed");
    } finally {
      setLoadingPlanId("");
    }
  };

  if (loading || !canRender) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="loading-card">Checking your subscription access...</div>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="w-full max-w-6xl space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="heading-primary text-4xl font-bold tracking-tight">Choose your plan</h1>
          <p className="text-muted mx-auto max-w-2xl text-sm leading-6 md:text-base">
            Pick the membership level that fits your training intensity and unlock a fake 30-day subscription for testing.
          </p>
        </div>

        {isExpiredFlow ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm text-amber-800">
            Your plan has expired, please renew.
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrentPlan = subscriptionState === "active" && currentPlanId === plan.id;
            const buttonLabel = isCurrentPlan
              ? "Already Subscribed"
              : currentPlanLevel > 0 && plan.level > currentPlanLevel
                ? "Upgrade to"
                : currentPlanLevel > 0 && plan.level < currentPlanLevel
                  ? "Down to"
                  : "Subscribe";

            return (
            <article
              key={plan.id}
              className={`panel-surface ${isCurrentPlan ? "ring-2 ring-emerald-400/70 dark:ring-emerald-500/50" : ""}`}
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="heading-primary text-2xl font-bold">{plan.name}</h2>
                    {isCurrentPlan ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <p className="heading-primary text-3xl font-extrabold">{plan.price}</p>
                  <p className="text-muted text-sm leading-6">{plan.description}</p>
                </div>

                <ul className="space-y-3 text-sm">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className="dark-card px-4 py-3 text-muted">
                      {benefit}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loadingPlanId === plan.id || isCurrentPlan}
                  className="dark-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loadingPlanId === plan.id ? "Processing..." : buttonLabel}
                </button>
              </div>
            </article>
          );
          })}
        </div>
      </section>
    </main>
  );
}
