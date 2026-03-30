"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { getExpiryCountdown, getSubscriptionState } from "@/lib/auth";
import { STORAGE_UID_KEY } from "@/lib/plans";
import { notifyError, notifySuccess } from "@/lib/toast";
import { useAuthContext } from "@/components/auth-provider";

type AppShellProps = {
  title: string;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
};

export function AppShell({ title, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuthContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const firstName = profile?.name?.split(" ")[0] || "User";
  const isAdmin = profile?.role === "admin";
  const subscriptionState = getSubscriptionState(profile?.subscription);
  const expiryCountdown = getExpiryCountdown(profile?.subscription);
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric"
      }),
    []
  );

  const navItems = useMemo<NavItem[]>(
    () =>
      isAdmin
        ? [
            { href: "/admin", label: "Admin Home" },
            { href: "/admin/add-content", label: "Add Content" },
            { href: "/admin/manage-content", label: "Manage Content" },
            { href: "/admin/users", label: "Manage Users" },
            { href: "/profile", label: "Profile" },
            { href: "/settings", label: "Settings" },
            { href: "/about", label: "About Us" },
            { href: "/help", label: "Help / Feedback" },
            { href: "/terms", label: "Terms & Conditions" },
            { href: "/privacy", label: "Privacy Policy" }
          ]
        : [
            { href: "/dashboard", label: "Dashboard" },
            { href: "/plans?upgrade=1", label: "Plans" },
            { href: "/profile", label: "Profile" },
            { href: "/settings", label: "Settings" },
            { href: "/about", label: "About Us" },
            { href: "/help", label: "Help / Feedback" },
            { href: "/terms", label: "Terms & Conditions" },
            { href: "/privacy", label: "Privacy Policy" }
          ],
    [isAdmin]
  );

  const handleLogout = async () => {
    try {
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      localStorage.removeItem(STORAGE_UID_KEY);
      notifySuccess("Logged out successfully");
      router.replace("/login");
    } catch (error) {
      console.error("Shell logout error:", error);
      notifyError(error instanceof Error ? error.message : "Logout failed");
    }
  };

  return (
    <div className="flex min-h-screen bg-transparent text-slate-900 dark:text-white">
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-white/50 bg-white/92 p-5 shadow-lg backdrop-blur transition-transform duration-300 dark:border-gray-800 dark:bg-gray-950 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">Gym Trainer App</p>
            <h2 className="heading-primary mt-2 text-lg font-bold">{isAdmin ? "Admin Panel" : "Member Area"}</h2>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="dark-button-secondary px-3 py-2 text-sm font-semibold"
          >
            Close
          </button>
        </div>

        {!isAdmin ? (
          <div className="dark-card rounded-3xl p-4">
            <p className="text-soft text-sm">Subscription</p>
            <h3 className="heading-primary mt-2 text-lg font-bold">
              {subscriptionState === "active" ? `Expires in ${expiryCountdown} day${expiryCountdown === 1 ? "" : "s"}` : "No active plan"}
            </h3>
            <Link
              href="/plans?upgrade=1"
              onClick={() => setSidebarOpen(false)}
              className="dark-button-primary mt-3 inline-flex w-fit items-center justify-center self-start rounded-xl px-2.5 py-1 text-[11px] font-semibold leading-none"
            >
              Upgrade Plan
            </Link>
          </div>
        ) : null}

        <nav className="mt-6 flex-1 space-y-2 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-slate-900 text-white dark:bg-gray-800 dark:text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <p className="text-muted mt-4 text-sm">
          Signed in as <span className="heading-primary font-semibold">{profile?.name || "User"}</span>
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          Logout
        </button>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/40 bg-white/80 px-4 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950 md:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
              >
                <span className="sr-only">Open navigation</span>
                <span className="flex flex-col gap-1.5">
                  <span className="block h-0.5 w-5 bg-current" />
                  <span className="block h-0.5 w-5 bg-current" />
                  <span className="block h-0.5 w-5 bg-current" />
                </span>
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">Gym Trainer App</p>
                <h1 className="heading-primary text-2xl font-bold">{title}</h1>
              </div>
            </div>

            <div className="text-right">
              <p className="text-soft text-sm">Welcome, {firstName}</p>
              <p className="text-faint mt-1 text-xs">{todayLabel}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        <footer className="border-t border-white/40 px-4 py-4 text-center text-sm text-slate-500 dark:border-gray-800 dark:text-gray-400 md:px-8">
          © 2026 All Rights Reserved
        </footer>
      </div>
    </div>
  );
}
