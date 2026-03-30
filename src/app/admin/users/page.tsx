"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { useAdminProtection } from "@/hooks/use-admin-protection";
import type { UserProfile } from "@/lib/auth";
import { getSubscriptionState } from "@/lib/auth";
import { getPlanById, getPlanLabelFromLevel, getPlanLevelFromPlanId } from "@/lib/plans";
import { AppShell } from "@/components/app-shell";
import { dismissToast, notifyError, notifyLoading, notifySuccess } from "@/lib/toast";

export default function AdminUsersPage() {
  const { authResolved, canRender } = useAdminProtection("protected");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadUsers = async () => {
    setLoading(true);

    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const snapshot = await getDocs(collection(db, "users"));
      setUsers(snapshot.docs.map((doc) => doc.data() as UserProfile));
    } catch (error) {
      console.error("Users fetch error:", error);
      notifyError(error instanceof Error ? error.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authResolved || !canRender) {
      return;
    }

    void loadUsers();
  }, [authResolved, canRender]);

  const subscribedUsers = useMemo(
    () => users.filter((user) => getSubscriptionState(user.subscription) === "active"),
    [users]
  );
  const nonSubscribedUsers = useMemo(
    () => users.filter((user) => getSubscriptionState(user.subscription) !== "active" && user.role !== "admin"),
    [users]
  );

  const handleSendReminders = async () => {
    setSending(true);
    const loadingToast = notifyLoading("Sending reminder emails...");

    try {
      const response = await fetch("/api/admin/send-reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          users: nonSubscribedUsers.map((user) => ({
            name: user.name || "Member",
            email: user.email || ""
          }))
        })
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Failed to send reminders");
      }

      dismissToast(loadingToast);
      notifySuccess(result.message || "Reminder request completed");
    } catch (error) {
      console.error("Send reminders error:", error);
      dismissToast(loadingToast);
      notifyError(error instanceof Error ? error.message : "Failed to send reminders");
    } finally {
      setSending(false);
    }
  };

  if (!authResolved || !canRender) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="loading-card">Checking admin access...</div>
      </main>
    );
  }

  return (
    <AppShell title="Manage Users">
      <div className="flex flex-col gap-6">
        <header className="panel-surface">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-rose-500">User Management</p>
              <h1 className="heading-primary text-3xl font-bold">Users and Subscription Status</h1>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleSendReminders()}
                disabled={sending || nonSubscribedUsers.length === 0}
                className="dark-button-primary px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {sending ? "Sending..." : "Send Reminder Email"}
              </button>
              <Link href="/admin" className="dark-button-secondary px-5 py-3 text-sm font-semibold">
                Admin Home
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <UserSection title="Subscribed Users" users={subscribedUsers} loading={loading} subscribed />
          <UserSection title="Non-Subscribed Users" users={nonSubscribedUsers} loading={loading} subscribed={false} />
        </section>
      </div>
    </AppShell>
  );
}

function UserSection({
  title,
  users,
  loading,
  subscribed
}: {
  title: string;
  users: UserProfile[];
  loading: boolean;
  subscribed: boolean;
}) {
  if (loading) {
    return (
      <section className="panel-surface">
        <h2 className="heading-primary text-2xl font-bold">{title}</h2>
        <div className="panel-muted mt-5 px-4 py-3 text-sm">Loading users...</div>
      </section>
    );
  }

  return (
    <section className="panel-surface">
      <h2 className="heading-primary text-2xl font-bold">{title}</h2>
      <div className="mt-5 space-y-4">
        {users.length === 0 ? (
          <div className="panel-muted px-4 py-3 text-sm">No users in this category.</div>
        ) : (
          users.map((user) => {
            const planLevel = user.subscription?.planLevel || getPlanLevelFromPlanId(user.subscription?.planId);
            const plan = getPlanById(user.subscription?.planId);

            return (
              <article key={user.uid || user.email} className="dark-card rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="heading-primary text-lg font-bold">{user.name || "Unnamed User"}</h3>
                    <p className="text-muted text-sm">{user.email}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      subscribed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {subscribed ? "Subscribed" : "No active plan"}
                  </span>
                </div>

                <div className="text-muted mt-4 grid gap-2 text-sm">
                  <p>Weight: {user.weight || "-"} kg</p>
                  <p>Height: {user.height || "-"} cm</p>
                  <p>BMI: {user.bmi || "-"} ({user.bmiCategory || "-"})</p>
                  <p>Plan: {plan?.name || getPlanLabelFromLevel(planLevel)}</p>
                  <p>Expiry: {user.subscription?.expiry ? new Date(user.subscription.expiry).toLocaleDateString() : "Not subscribed"}</p>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
