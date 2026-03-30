"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { getPlanById, getPlanLabelFromLevel, getPlanLevelFromPlanId } from "@/lib/plans";
import { useRouteProtection } from "@/hooks/use-route-protection";
import type { ContentItem } from "@/lib/content";
import { getBmiCategoryLabel, getContentTypeLabel, getPlanLevelLabel, getPublishedDays, isContentVisible } from "@/lib/content";
import {
  buildSubscriptionUpdate,
  canRenewSubscription,
  getCurrentSubscriptionDay,
  getEffectiveSubscription,
  getExpiryCountdown,
  getSubscriptionExpiryDate,
  getSubscriptionStartDate,
  hasPendingRenewal
} from "@/lib/auth";
import { getBmiCategory } from "@/lib/bmi";
import { AppShell } from "@/components/app-shell";
import { dismissToast, notifyError, notifyLoading, notifySuccess, notifyWarning } from "@/lib/toast";
import { ContentModal } from "@/components/content-modal";

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading dashboard..." />}>
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardPageContent() {
  const { user, profile, loading, canRender, refreshProfile, subscriptionState } = useRouteProtection("dashboard");
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [allVisibleItems, setAllVisibleItems] = useState<ContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | "">("");
  const [renewing, setRenewing] = useState(false);
  const activeSubscription = getEffectiveSubscription(profile?.subscription);
  const activePlan = getPlanById(activeSubscription?.planId);
  const userPlanLevel = activeSubscription?.planLevel || getPlanLevelFromPlanId(activeSubscription?.planId);
  const derivedBmiCategory = profile?.bmiCategory || (profile?.bmi ? getBmiCategory(profile.bmi) : undefined);
  const computedSubscriptionDay = getCurrentSubscriptionDay(profile?.subscription);
  const currentDay = computedSubscriptionDay || (subscriptionState === "active" ? 1 : 0);
  const expiryCountdown = getExpiryCountdown(profile?.subscription);
  const derivedStartDate = getSubscriptionStartDate(profile?.subscription);
  const expiryDate = getSubscriptionExpiryDate(profile?.subscription);
  const renewalQueued = hasPendingRenewal(profile?.subscription);
  const canRenew = canRenewSubscription(profile?.subscription);
  const subscriptionStartDate = useMemo(() => {
    if (!derivedStartDate) {
      return "Not available";
    }

    return derivedStartDate.toLocaleDateString();
  }, [derivedStartDate]);
  const subscriptionExpiryLabel = useMemo(() => {
    if (!expiryDate) {
      return "Not available";
    }

    return expiryDate.toLocaleString();
  }, [expiryDate]);
  const renewalStartLabel = useMemo(() => {
    if (!profile?.subscription?.renewalStartDate) {
      return "";
    }

    const startDate = new Date(profile.subscription.renewalStartDate);
    return Number.isNaN(startDate.getTime()) ? "" : startDate.toLocaleString();
  }, [profile?.subscription?.renewalStartDate]);
  const publishedDays = useMemo(() => getPublishedDays(allVisibleItems), [allVisibleItems]);
  const workouts = contentItems.filter((item) => item.type === "workout");
  const diets = contentItems.filter((item) => item.type === "diet");
  const tips = contentItems.filter((item) => item.type === "tip");

  const handleRenewPlan = async () => {
    if (!user?.uid || !activeSubscription?.planId) {
      return;
    }

    setRenewing(true);
    const loadingToast = notifyLoading("Scheduling renewal...");

    try {
      const { doc, setDoc, collection, addDoc } = await import("firebase/firestore");
      const planId = activeSubscription?.planId;
      const plan = PLANS.find(p => p.id === planId);

      await setDoc(
        doc(db, "users", user.uid),
        {
          subscription: buildSubscriptionUpdate({
            currentSubscription: profile?.subscription,
            planId: activeSubscription.planId,
            planLevel: activeSubscription.planLevel || getPlanLevelFromPlanId(activeSubscription.planId)
          }),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

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
      notifySuccess("Renewal scheduled. Your next plan cycle will start when the current one expires.");
    } catch (error) {
      console.error("Renewal error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Failed to schedule renewal");
    } finally {
      setRenewing(false);
    }
  };

  const handleDayChange = (value: string) => {
    if (!value) {
      setSelectedDay("");
      return;
    }

    const nextDay = Number(value);

    if (nextDay > currentDay) {
      notifyWarning(`Day ${nextDay} is an advance post. It will unlock on that day only.`);
      return;
    }

    setSelectedDay(nextDay);
  };

  useEffect(() => {
    if (!currentDay || publishedDays.length === 0) {
      setSelectedDay("");
      return;
    }

    setSelectedDay(publishedDays.includes(currentDay) ? currentDay : "");
  }, [currentDay, publishedDays]);

  useEffect(() => {
    if (loading || !canRender) {
      return;
    }

    if (!userPlanLevel || !derivedBmiCategory) {
      setContentItems([]);
      setAllVisibleItems([]);
      setContentLoading(false);
      return;
    }

    let active = true;

    const loadContent = async () => {
      setContentLoading(true);

      try {
        const { collection, getDocs } = await import("firebase/firestore");
        const snapshot = await getDocs(collection(db, "content"));

        if (!active) {
          return;
        }

        const visibleItems = snapshot.docs
          .map((doc) => {
            const data = doc.data() as Omit<ContentItem, "id">;

            return {
              id: doc.id,
              ...data
            };
          })
          .filter(
            (item) =>
              isContentVisible(item.createdAt) &&
              item.planLevel <= userPlanLevel &&
              (!item.bmiCategory || item.bmiCategory === derivedBmiCategory)
          )
          .sort((first, second) => {
            const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
            const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;

            return secondTime - firstTime;
          });

        const items = selectedDay ? visibleItems.filter((item) => item.dayNumber === selectedDay) : [];

        setAllVisibleItems(visibleItems);
        setContentItems(items);
        console.log("Loaded subscriber content for day:", selectedDay, "plan level:", userPlanLevel, "BMI:", derivedBmiCategory);
      } catch (error) {
        console.error("Content fetch error:", error);
        notifyError(error instanceof Error ? error.message : "Failed to load content");
      } finally {
        if (active) {
          setContentLoading(false);
        }
      }
    };

    void loadContent();

    return () => {
      active = false;
    };
  }, [canRender, derivedBmiCategory, loading, selectedDay, userPlanLevel]);

  if (loading || !canRender) {
    return <PageLoader label="Loading dashboard..." />;
  }

  return (
    <AppShell title="Dashboard">
      <div className="flex flex-col gap-6">
        <section className="grid gap-6 md:grid-cols-3">
          <div className="panel-surface">
            <p className="text-soft text-sm">Active Plan</p>
            <h2 className="heading-primary mt-2 text-xl font-semibold">{activePlan?.name || "No active plan"}</h2>
            <p className="text-muted mt-2 text-sm">
              {activeSubscription?.planId || "-"} {userPlanLevel ? `(${getPlanLabelFromLevel(userPlanLevel)})` : ""}
            </p>
            <p className="text-muted mt-3 text-sm">{expiryCountdown} day{expiryCountdown === 1 ? "" : "s"} left before expiry.</p>
            <p className="text-faint mt-1 text-xs">Expires on {subscriptionExpiryLabel}</p>
            {renewalQueued ? (
              <div className="mt-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200">
                Renewal scheduled for {renewalStartLabel || "the exact expiry time"}.
              </div>
            ) : null}
            {canRenew ? (
              <button
                type="button"
                onClick={() => void handleRenewPlan()}
                disabled={renewing}
                className="dark-button-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-70"
              >
                {renewing ? "Scheduling..." : "Renew Plan"}
              </button>
            ) : null}
          </div>
          <div className="panel-surface">
            <p className="text-soft text-sm">Current Day</p>
            <h2 className="heading-primary mt-2 text-xl font-semibold">
              Day {currentDay || 0} of 30
            </h2>
            <p className="text-muted mt-2 text-sm">
              Start date: {subscriptionStartDate}
            </p>
            <div className="mt-4">
              <label className="text-soft mb-2 block text-sm">View Published Day</label>
              <select
                value={selectedDay === "" ? "" : String(selectedDay)}
                onChange={(event) => handleDayChange(event.target.value)}
                className="dark-input w-full"
              >
                <option value="">Select posted day</option>
                {publishedDays.map((day) => (
                  <option key={day} value={String(day)}>
                    Day {day}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="panel-surface">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-soft text-sm">Active Plan</p>
                <h2 className="heading-primary mt-1 text-2xl font-bold">
                  {activePlan?.name || "No active plan"}
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className="theme-badge">
                    {activeSubscription?.planLevel ? `Level ${activeSubscription.planLevel}` : "Level 0"}
                  </span>
                  <span className="text-faint text-xs uppercase tracking-widest">
                    {subscriptionState}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-soft text-sm">Status</p>
                <p className={`mt-1 font-bold ${subscriptionState === "active" ? "text-emerald-500" : "text-rose-500"}`}>
                  {getExpiryCountdown(profile?.subscription)} Days Left
                </p>
              </div>
            </div>

            {getSubscriptionExpiryDate(profile?.subscription) && (
              <div className="mt-6 border-t border-slate-100 pt-4 dark:border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Expiry Date</span>
                  <span className="font-medium text-slate-700 dark:text-gray-300">
                    {getSubscriptionExpiryDate(profile?.subscription)?.toLocaleDateString(undefined, { dateStyle: "long" })}
                  </span>
                </div>
              </div>
            )}

            {hasPendingRenewal(profile?.subscription) && (profile?.subscription?.renewalPlanLevel || 0) < (activeSubscription?.planLevel || 0) && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                <p className="font-semibold">Plan Downgrade Scheduled</p>
                <p className="mt-1 opacity-80">
                  Your plan will downgrade to Plan {getPlanLabelFromLevel(profile?.subscription?.renewalPlanLevel)} after your current plan expires.
                </p>
              </div>
            )}

            {canRenew && (
              <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-blue-50/50 p-4 dark:bg-blue-950/20">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  Your plan is expiring soon. Renew now to maintain your progress!
                </p>
                <button
                  onClick={() => router.push("/plans")}
                  className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-500"
                >
                  Renew Now
                </button>
              </div>
            )}
          </div>

          <div className="panel-surface">
            <p className="text-soft text-sm">BMI Profile</p>
            <h2 className="heading-primary mt-2 text-xl font-semibold capitalize">
              {derivedBmiCategory ? getBmiCategoryLabel(derivedBmiCategory) : "-"}
            </h2>
            <p className="text-muted mt-2 text-sm">
              BMI score: {profile?.bmi || "-"} | Status: {subscriptionState}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="panel-surface">
            <h3 className="heading-primary mb-4 text-xl font-semibold">Workouts</h3>
            <ContentList items={workouts} loading={contentLoading} currentDay={selectedDay} />
          </article>

          <article className="panel-surface">
            <h3 className="heading-primary mb-4 text-xl font-semibold">Diet Plans</h3>
            <ContentList items={diets} loading={contentLoading} currentDay={selectedDay} />
          </article>

          <article className="panel-surface">
            <h3 className="heading-primary mb-4 text-xl font-semibold">Tips</h3>
            <ContentList items={tips} loading={contentLoading} currentDay={selectedDay} />
          </article>
        </section>
      </div>
    </AppShell>
  );
}

function PageLoader({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="panel-surface text-muted px-6 py-4 text-sm">{label}</div>
    </main>
  );
}

function ContentList({ items, loading, currentDay }: { items: ContentItem[]; loading: boolean; currentDay: number | "" }) {
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  if (loading) {
    return <div className="panel-muted px-4 py-3 text-sm">Loading content...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="panel-muted px-4 py-3 text-sm">
        {currentDay ? `No content available for Day ${currentDay} in your plan and BMI category yet.` : "Select a published day to view content."}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((item) => (
          <div 
            key={item.id} 
            className="dark-card group cursor-pointer px-4 py-4 text-sm transition-all duration-200 hover:scale-[1.02] hover:bg-slate-50/50 dark:hover:bg-gray-900/50"
            onClick={() => setSelectedItem(item)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="heading-primary text-lg font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</h4>
                <p className="text-muted mt-1 leading-6 line-clamp-2">{item.description}</p>
              </div>
              <span className="theme-badge shrink-0">
                {getPlanLevelLabel(item.planLevel)}
              </span>
            </div>
            <div className="text-faint mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
              <span>{getContentTypeLabel(item.type)}</span>
              <span>Day {item.dayNumber}</span>
              <span>{getBmiCategoryLabel(item.bmiCategory)}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <ContentModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </>
  );
}
