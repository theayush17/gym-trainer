"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { auth } from "@/lib/firebase";
import { STORAGE_UID_KEY } from "@/lib/plans";
import { notifyError, notifySuccess } from "@/lib/toast";
import { useAuthContext } from "@/components/auth-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { useThemeContext } from "@/components/theme-provider";

type AppShellProps = {
  title: string;
  children: ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuthContext();
  const { theme, toggleTheme } = useThemeContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const firstName = profile?.name?.split(" ")[0] || "User";
  const userInitial = firstName.charAt(0).toUpperCase();
  const isAdmin = profile?.role === "admin";
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
      <AppSidebar
        isAdmin={isAdmin}
        profileName={profile?.name}
        userInitial={userInitial}
        pathname={pathname}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={() => void handleLogout()}
      />

      <div className="flex min-h-screen flex-1 flex-col md:pl-16">
        <header className="sticky top-0 z-30 border-b border-white/40 bg-white/80 px-4 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950 md:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800 md:hidden"
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

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-900 dark:text-slate-100 dark:hover:bg-gray-800"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="hidden sm:inline">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </button>

              <div className="text-right">
                <p className="text-soft text-sm">Welcome, {firstName}</p>
                <p className="text-faint mt-1 text-xs">{todayLabel}</p>
              </div>
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
