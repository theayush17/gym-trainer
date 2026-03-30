"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { getPlanLevelFromPlanId, PLANS, getPlanLabelFromLevel } from "@/lib/plans";
import { useRouteProtection } from "@/hooks/use-route-protection";
import { buildSubscriptionUpdate, getEffectiveSubscription, hasPendingRenewal, canRenewSubscription } from "@/lib/auth";
import { dismissToast, notifyError, notifyLoading, notifySuccess, notifyWarning } from "@/lib/toast";
import { AppShell } from "@/components/app-shell";

export default function PlansPage() {
  return (
    <Suspense fallback={<PageLoader label="Checking your subscription access..." />}>
      <PlansPageContent />
    </Suspense>
  );
}

function PlansPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingPlanId, setLoadingPlanId] = useState("");
  const { user, profile, loading, canRender, refreshProfile, subscriptionState } = useRouteProtection("plans");
  const isExpiredFlow = searchParams.get("reason") === "expired" || subscriptionState === "expired";
  const activeSubscription = getEffectiveSubscription(profile?.subscription);
  const currentPlanId = activeSubscription?.planId || "";
  const currentPlanLevel = activeSubscription?.planLevel || getPlanLevelFromPlanId(currentPlanId);
  const renewalQueued = hasPendingRenewal(profile?.subscription);
  const canRenew = canRenewSubscription(profile?.subscription);

  const handleSubscribe = async (planId: string) => {
    if (!user?.uid) {
      notifyWarning("Please login first");
      router.replace("/login");
      return;
    }

    setLoadingPlanId(planId);
    const loadingToast = notifyLoading("Updating subscription...");

    try {
      const { doc, updateDoc, collection, addDoc } = await import("firebase/firestore");
      const plan = PLANS.find((p) => p.id === planId);
      const planLevel = plan?.level ?? 0;

      const updatedSubscription = buildSubscriptionUpdate({
        currentSubscription: profile?.subscription,
        planId,
        planLevel
      });

      await updateDoc(doc(db, "users", user.uid), {
        subscription: updatedSubscription,
        updatedAt: new Date().toISOString()
      });

      // Record transaction
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        planId: planId,
        amount: plan?.numericPrice || 0,
        status: "active",
        createdAt: new Date().toISOString()
      });

      await refreshProfile();

      dismissToast(loadingToast);
      
      const isDowngrade = planLevel < currentPlanLevel && subscriptionState === "active" && !canRenew;
      
      if (isDowngrade) {
        notifySuccess(`Plan ${plan?.label} scheduled for next cycle.`);
      } else {
        notifySuccess("Subscription updated successfully!");
      }
      
      router.replace("/dashboard");
    } catch (error) {
      console.error("Subscription update error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Failed to update subscription. Please check permissions.");
    } finally {
      setLoadingPlanId("");
    }
  };

  if (loading || !canRender) {
    return <PageLoader label="Checking your subscription access..." />;
  }

  return (
    <AppShell title="Plans">
      <section className="w-full max-w-6xl space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="heading-primary text-4xl font-bold tracking-tight">Choose your plan</h1>
          <p className="text-muted mx-auto max-w-2xl text-sm leading-6 md:text-base">
            Pick the membership level that fits your training intensity. Upgrades are immediate, downgrades are scheduled for next cycle.
          </p>
        </div>

        {isExpiredFlow ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm text-amber-800">
            Your plan has expired, please renew to continue.
          </div>
        ) : null}

        {renewalQueued ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200">
            {profile?.subscription?.renewalPlanLevel && profile.subscription.renewalPlanLevel < (activeSubscription?.planLevel || 0) 
              ? `A downgrade to Plan ${getPlanLabelFromLevel(profile.subscription.renewalPlanLevel)} is scheduled.`
              : `A renewal is already scheduled for your next cycle.`}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrentPlan = subscriptionState === "active" && currentPlanId === plan.id;
            const isQueuedPlan = renewalQueued && profile?.subscription?.renewalPlanId === plan.id;
            
            let buttonLabel = "Subscribe";
            let isDisabled = loadingPlanId !== "" || isQueuedPlan;

            if (isQueuedPlan) {
              buttonLabel = "Scheduled";
            } else if (isCurrentPlan) {
              if (canRenew) {
                buttonLabel = "Renew Plan";
                isDisabled = false;
              } else {
                buttonLabel = "Current Plan";
                isDisabled = true;
              }
            } else if (currentPlanLevel > 0) {
              if (plan.level > currentPlanLevel) {
                buttonLabel = "Upgrade Now";
              } else if (plan.level < currentPlanLevel) {
                buttonLabel = "Downgrade (Later)";
              } else if (canRenew) {
                buttonLabel = "Switch & Renew";
              }
            }

            return (
              <article
                key={plan.id}
                className={`panel-surface flex flex-col ${isCurrentPlan || isQueuedPlan ? "ring-2 ring-emerald-400/70 dark:ring-emerald-500/50" : ""}`}
              >
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="heading-primary text-2xl font-bold">{plan.name}</h2>
                      {(isCurrentPlan || isQueuedPlan) && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {isQueuedPlan ? "Scheduled" : "Current"}
                        </span>
                      )}
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
                    disabled={isDisabled}
                    className={`dark-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70 ${
                      buttonLabel.includes("Upgrade") ? "!bg-blue-600 hover:!bg-blue-500" : ""
                    }`}
                  >
                    {loadingPlanId === plan.id ? "Processing..." : buttonLabel}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

function PageLoader({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="loading-card">{label}</div>
    </main>
  );
}
