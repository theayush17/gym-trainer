"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PLANS, getPlanLabelFromLevel } from "@/lib/plans";
import { useRouteProtection } from "@/hooks/use-route-protection";
import { getEffectiveSubscription, hasPendingRenewal, canRenewSubscription } from "@/lib/auth";
import { dismissToast, notifyError, notifyLoading, notifySuccess, notifyWarning } from "@/lib/toast";
import { AppShell } from "@/components/app-shell";

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
  const currentPlanLevel = Number(activeSubscription?.planLevel || 0);
  const renewalQueued = hasPendingRenewal(profile?.subscription);
  const canRenew = canRenewSubscription(profile?.subscription);

  const handleSubscribe = async (planId: string) => {
    if (!user?.uid) {
      notifyWarning("Please login first");
      router.replace("/login");
      return;
    }

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return;

    const planLevel = plan.level;
    
    // 1. STRICT DOWNGRADE CHECK (Deferred update, no payment)
    const isLegitDowngrade = 
      subscriptionState === "active" && 
      currentPlanLevel > 0 && 
      planLevel < currentPlanLevel && 
      !canRenew;

    if (isLegitDowngrade) {
      setLoadingPlanId(planId);
      const loadingToast = notifyLoading("Scheduling downgrade...");
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const { buildSubscriptionUpdate } = await import("@/lib/auth");

        const updatedSubscription = buildSubscriptionUpdate({
          currentSubscription: profile?.subscription,
          planId,
          planLevel
        });

        await updateDoc(doc(db, "users", user.uid), {
          subscription: updatedSubscription,
          updatedAt: new Date().toISOString()
        });

        await refreshProfile();
        dismissToast(loadingToast);
        notifySuccess(`Plan ${plan.label} scheduled for next cycle.`);
        router.replace("/dashboard");
      } catch (error) {
        console.error("[PlanSelection] Downgrade error:", error);
        dismissToast(loadingToast);
        notifyError("Failed to schedule downgrade");
      } finally {
        setLoadingPlanId("");
      }
      return;
    }

    // 2. ALL OTHER PATHS (New Subscribe, Upgrade, Renewal) MUST go through Razorpay
    if (typeof window.Razorpay === "undefined") {
      notifyError("Payment system is not ready. Please refresh the page.");
      return;
    }

    setLoadingPlanId(planId);
    const loadingToast = notifyLoading("Initiating payment...");
    const requestId = Math.random().toString(36).substring(7);

    console.log(`[PaymentFlow] [${requestId}] Initiating for plan: ${planId}`);

    try {
      // Ensure Razorpay script is loaded. If not, try to wait or notify.
      if (typeof window.Razorpay === "undefined") {
        console.error(`[PaymentFlow] [${requestId}] Razorpay SDK missing`);
        // Simple retry logic or wait
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (typeof window.Razorpay === "undefined") {
          throw new Error("Payment system (Razorpay) failed to load. Please refresh and try again.");
        }
      }

      console.log(`[PaymentFlow] [${requestId}] Creating backend order...`);
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.numericPrice,
          planId: plan.id,
          userId: user.uid
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        console.error(`[PaymentFlow] [${requestId}] Order creation failed:`, orderData);
        throw new Error(orderData.error || "Failed to create order. Please try again.");
      }

      console.log(`[PaymentFlow] [${requestId}] Order created: ${orderData.order_id}. Opening Razorpay...`);
      dismissToast(loadingToast);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Gym Trainer",
        description: `${plan.name} Subscription`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          const verifyToast = notifyLoading("Verifying payment...");
          console.log(`[PaymentFlow] [${requestId}] Payment successful, ID: ${response.razorpay_payment_id}. Verifying...`);

          try {
            const verifyPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user.uid,
              planId: plan.id
            };

            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(verifyPayload)
            });

            const verifyData = await verifyRes.json();
            
            if (!verifyRes.ok || !verifyData.success) {
              console.error(`[PaymentFlow] [${requestId}] Verification failed:`, verifyData);
              throw new Error(verifyData.error || "Payment verification failed. Please contact support.");
            }

            console.log(`[PaymentFlow] [${requestId}] Verification SUCCESS. refreshing...`);
            dismissToast(verifyToast);
            notifySuccess("Plan activated successfully.");
            
            await refreshProfile();
            window.location.href = "/dashboard";
          } catch (err) {
            console.error(`[PaymentFlow] [${requestId}] Verification handler error:`, err);
            dismissToast(verifyToast);
            notifyError(err instanceof Error ? err.message : "Verification failed");
            setLoadingPlanId("");
          }
        },
        prefill: {
          name: profile?.name || "",
          email: profile?.email || "",
          contact: profile?.phoneNumber || ""
        },
        theme: {
          color: "#e11d48"
        },
        modal: {
          ondismiss: () => {
            console.log(`[PaymentFlow] [${requestId}] Checkout modal closed by user`);
            notifyWarning("Payment was not completed.");
            setLoadingPlanId("");
          },
          escape: false, // Prevent closing on escape to reduce accidental closes
          backdropclose: false // Prevent closing on backdrop click
        },
        "callback_url": "", // Leave empty for custom handler
        "redirect": false
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", (response: any) => {
        console.error(`[PaymentFlow] [${requestId}] Razorpay FAIL event:`, response.error);
        notifyError(`Payment failed: ${response.error.description}`);
        setLoadingPlanId("");
      });

      rzp.open();
    } catch (error) {
      console.error(`[PaymentFlow] [${requestId}] Initiation error:`, error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Failed to initiate payment. Please try again.");
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
