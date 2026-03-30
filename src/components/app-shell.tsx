"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { auth } from "@/lib/firebase";
import { STORAGE_UID_KEY } from "@/lib/plans";
import { notifyError, notifySuccess } from "@/lib/toast";
import { useAuthContext } from "@/components/auth-provider";
import { AppFooter } from "@/components/app-footer";
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
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-transparent text-slate-900 transition-colors duration-300 dark:text-white">
      <AppSidebar
        isAdmin={isAdmin}
        profileName={profile?.name}
        userInitial={userInitial}
        pathname={pathname}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={() => void handleLogout()}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:pl-16">
        <header className="sticky top-0 z-30 w-full max-w-full border-b border-white/40 bg-white/80 px-4 py-4 backdrop-blur transition-colors duration-300 dark:border-gray-800 dark:bg-gray-950 md:px-6 lg:px-8">
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-gray-800 dark:bg-gray-900 dark:text-slate-100 dark:hover:bg-gray-800"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <div className="text-right">
                <p className="text-soft text-sm">Welcome, {firstName}</p>
                <p className="text-faint mt-1 text-xs">{todayLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-full px-4 py-8 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl min-w-0">{children}</div>
        </main>

        <AppFooter />
      </div>
    </div>
  );
}
