"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { useAdminProtection } from "@/hooks/use-admin-protection";
import type { ContentItem } from "@/lib/content";
import { getContentTypeLabel, getPlanLevelLabel, getPublishedDays, isContentVisible } from "@/lib/content";
import type { UserProfile } from "@/lib/auth";
import { getSubscriptionState } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { notifyError } from "@/lib/toast";

export default function AdminHomePage() {
  const { authResolved, canRender } = useAdminProtection("protected");
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState("all");

  useEffect(() => {
    if (!authResolved || !canRender) {
      return;
    }

    let active = true;

    const loadAdminData = async () => {
      setLoading(true);

      try {
        const { collection, getDocs } = await import("firebase/firestore");
        const [contentSnapshot, usersSnapshot] = await Promise.all([
          getDocs(collection(db, "content")),
          getDocs(collection(db, "users"))
        ]);

        if (!active) {
          return;
        }

        const nextContent = contentSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<ContentItem, "id">)
        })).filter((item) => isContentVisible(item.createdAt));
        const nextUsers = usersSnapshot.docs.map((doc) => doc.data() as UserProfile);

        setContentItems(nextContent);
        setUsers(nextUsers);
      } catch (error) {
        console.error("Admin overview load error:", error);
        notifyError(error instanceof Error ? error.message : "Failed to load admin overview");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadAdminData();

    return () => {
      active = false;
    };
  }, [authResolved, canRender]);

  const subscribedUsers = useMemo(
    () => users.filter((currentUser) => getSubscriptionState(currentUser.subscription) === "active"),
    [users]
  );
  const nonSubscribedUsers = useMemo(
    () => users.filter((currentUser) => getSubscriptionState(currentUser.subscription) !== "active"),
    [users]
  );
  const latestContent = useMemo(
    () =>
      [...contentItems]
        .filter((item) => selectedDay === "all" || item.dayNumber === Number(selectedDay))
        .sort((first, second) => {
          const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
          const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;

          return secondTime - firstTime;
        })
        .slice(0, 6),
    [contentItems, selectedDay]
  );
  const publishedDays = useMemo(() => getPublishedDays(contentItems), [contentItems]);

  if (!authResolved || !canRender) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="panel-surface text-muted px-6 py-4 text-sm">Checking admin dashboard...</div>
      </main>
    );
  }

  return (
    <AppShell title="Admin Home">
      <div className="flex flex-col gap-6">
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Content" value={String(contentItems.length)} />
          <StatCard label="Active Subscribers" value={String(subscribedUsers.length)} />
          <StatCard label="No Active Plan" value={String(nonSubscribedUsers.length)} />
          <StatCard label="Loading State" value={loading ? "Refreshing" : "Ready"} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="panel-surface">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="heading-primary text-2xl font-bold">Latest Content</h2>
              <div className="flex items-center gap-3">
                <select
                  value={selectedDay}
                  onChange={(event) => setSelectedDay(event.target.value)}
                  className="dark-input min-w-36"
                >
                  <option value="all">All Days</option>
                  {publishedDays.map((day) => (
                    <option key={day} value={String(day)}>
                      Day {day}
                    </option>
                  ))}
                </select>
                <Link href="/admin/manage-content" className="text-sm font-semibold text-rose-600 hover:text-rose-700">
                  View all
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="panel-muted px-4 py-3 text-sm">Loading content...</div>
            ) : latestContent.length === 0 ? (
              <div className="panel-muted px-4 py-3 text-sm">No content added yet for the selected day.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {latestContent.map((item) => (
                  <article key={item.id} className="dark-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-faint text-xs font-semibold uppercase tracking-[0.18em]">
                          {getContentTypeLabel(item.type)}
                        </p>
                        <h3 className="heading-primary mt-2 text-lg font-bold">{item.title}</h3>
                      </div>
                      <span className="theme-badge">
                        {getPlanLevelLabel(item.planLevel)}
                      </span>
                    </div>
                    <p className="text-soft mt-2 text-sm">Day {item.dayNumber}</p>
                    <p className="text-muted mt-3 text-sm leading-6">{item.description}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="panel-surface">
            <h2 className="heading-primary text-2xl font-bold">Quick Links</h2>
            <div className="mt-5 space-y-3">
              {[
                { href: "/admin/add-content", label: "Add day-wise content" },
                { href: "/admin/manage-content", label: "Edit or delete content" },
                { href: "/admin/users", label: "Review users and reminders" }
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="dark-button-secondary block px-4 py-4 text-sm font-semibold"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-surface">
      <p className="text-soft text-sm">{label}</p>
      <h2 className="heading-primary mt-2 text-3xl font-bold">{value}</h2>
    </div>
  );
}
