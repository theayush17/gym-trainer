"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { CreditCard, FolderKanban, Home, LogOut, PlusSquare, Settings, User, Users, Dumbbell, History } from "lucide-react";
import { SidebarTooltip } from "@/components/sidebar-tooltip";

type SidebarItem = {
  href: string;
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type AppSidebarProps = {
  isAdmin: boolean;
  profileName?: string;
  userInitial: string;
  pathname: string;
  sidebarOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
};

export function AppSidebar({
  isAdmin,
  profileName,
  userInitial,
  pathname,
  sidebarOpen,
  onClose,
  onLogout
}: AppSidebarProps) {
  const navItems: SidebarItem[] = isAdmin
    ? [
        { href: "/admin", path: "/admin", label: "Dashboard", icon: Home },
        { href: "/admin/add-content", path: "/admin/add-content", label: "Add Content", icon: PlusSquare },
        { href: "/admin/manage-content", path: "/admin/manage-content", label: "Manage Content", icon: FolderKanban },
        { href: "/admin/users", path: "/admin/users", label: "Users", icon: Users },
        { href: "/history", path: "/history", label: "History & Transactions", icon: History }
      ]
    : [
        { href: "/dashboard", path: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/plans?upgrade=1", path: "/plans", label: "Plans", icon: CreditCard },
        { href: "/history", path: "/history", label: "History & Transactions", icon: History }
      ];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 md:hidden ${
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-14 flex-col border-r border-slate-200 bg-white px-1 py-3 text-slate-900 transition-all duration-300 dark:border-gray-800 dark:bg-gray-950 dark:text-white md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col items-center">
          <div className="flex flex-col items-center gap-2">
            <Link
              href={isAdmin ? "/admin" : "/dashboard"}
              onClick={onClose}
              className="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-900 transition-all duration-200 hover:scale-110 hover:bg-slate-200 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
            >
              <Dumbbell className="h-6 w-6" />
              <SidebarTooltip label="Gym Trainer" />
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all duration-200 hover:scale-110 hover:text-slate-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-white md:hidden"
            >
              <span className="sr-only">Close navigation</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-col items-center justify-start gap-2 py-3">
            {navItems.map((item) => {
              const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="group relative flex h-12 w-12 cursor-pointer items-center justify-center transition-all duration-200"
                >
                  <Icon
                    className={`h-6 w-6 transition-colors duration-200 ${
                      active
                        ? "text-slate-900 dark:text-white"
                        : "text-gray-400 group-hover:scale-110 group-hover:text-slate-900 dark:group-hover:text-white"
                    }`}
                  />
                  <SidebarTooltip label={item.label} />
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col items-center gap-4 pb-[10px]">
            <Link
              href="/settings"
              onClick={onClose}
              className="group relative flex h-12 w-12 cursor-pointer items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <Settings className={`h-6 w-6 transition-colors duration-200 ${pathname === "/settings" ? "text-slate-900 dark:text-white" : "text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white"}`} />
              <SidebarTooltip label="Settings" />
            </Link>

            <Link
              href="/profile"
              onClick={onClose}
              className="group relative flex h-12 w-12 cursor-pointer items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <User className={`h-6 w-6 transition-colors duration-200 ${pathname === "/profile" ? "text-slate-900 dark:text-white" : "text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white"}`} />
              <SidebarTooltip label={profileName || "Profile"} />
            </Link>

            <button
              type="button"
              onClick={onLogout}
              className="group relative flex h-12 w-12 cursor-pointer items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <LogOut className="h-6 w-6 text-gray-400 transition-colors duration-200 group-hover:text-slate-900 dark:group-hover:text-white" />
              <SidebarTooltip label="Logout" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
