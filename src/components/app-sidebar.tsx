"use client";

import { useEffect, type ComponentType } from "react";
import Link from "next/link";
import { CreditCard, FolderKanban, Home, LogOut, PlusSquare, Settings, User, Users, Dumbbell, History, X } from "lucide-react";
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
  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
    };
  }, [sidebarOpen]);

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
      {/* Mobile Overlay - Prevents touch through and closes on click */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        onTransitionEnd={(e) => {
          // Extra safety to ensure touch events are blocked
          if (sidebarOpen) e.currentTarget.style.pointerEvents = "auto";
        }}
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-[100dvh] flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-950 md:w-16 md:translate-x-0 md:overflow-x-visible ${
          sidebarOpen ? "w-[80%] translate-x-0" : "w-[80%] -translate-x-full md:w-16"
        } overflow-x-hidden overscroll-contain touch-pan-y`}
      >
        <div className="flex h-full flex-col p-4 overflow-x-hidden md:overflow-x-visible">
          {/* Top Logo Section - Fixed */}
          <div className="flex items-center justify-between gap-3 px-1 md:justify-center shrink-0">
            <Link
              href={isAdmin ? "/admin" : "/dashboard"}
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-900 transition-all hover:bg-slate-200 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
            >
              <Dumbbell className="h-7 w-7" />
            </Link>
            
            <span className="flex-1 text-base font-bold uppercase tracking-wider md:hidden truncate">Gym Trainer</span>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-white md:hidden"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation Section - Scrollable on mobile, visible on desktop */}
          <nav className="mt-10 flex-1 space-y-3 px-1 overflow-y-auto overflow-x-hidden scrollbar-none md:overflow-visible">
            {navItems.map((item) => {
              const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`group relative flex h-14 w-full items-center gap-4 rounded-xl transition-all duration-200 md:h-12 md:justify-center ${
                    active 
                      ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" 
                      : "text-slate-500 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-6 w-6 shrink-0" />
                  <span className="text-base font-semibold md:hidden truncate">{item.label}</span>
                  <SidebarTooltip label={item.label} className="hidden md:block" />
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions Section - Fixed at bottom */}
          <div className="mt-auto pt-6 space-y-3 border-t border-slate-100 dark:border-gray-800 px-1 shrink-0 md:overflow-visible">
            <Link
              href="/settings"
              onClick={onClose}
              className={`group relative flex h-14 w-full items-center gap-4 rounded-xl transition-all duration-200 md:h-12 md:justify-center ${
                pathname === "/settings" 
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" 
                  : "text-slate-500 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
              }`}
            >
              <Settings className="h-6 w-6 shrink-0" />
              <span className="text-base font-semibold md:hidden">Settings</span>
              <SidebarTooltip label="Settings" className="hidden md:block" />
            </Link>

            <Link
              href="/profile"
              onClick={onClose}
              className={`group relative flex h-14 w-full items-center gap-4 rounded-xl transition-all duration-200 md:h-12 md:justify-center ${
                pathname === "/profile" 
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" 
                  : "text-slate-500 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
              }`}
            >
              <User className="h-6 w-6 shrink-0" />
              <span className="text-base font-semibold md:hidden truncate">
                {profileName || "Profile"}
              </span>
              <SidebarTooltip label="Profile" className="hidden md:block" />
            </Link>

            <button
              type="button"
              onClick={onLogout}
              className="group relative flex h-14 w-full items-center gap-4 rounded-xl text-slate-500 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 dark:text-gray-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 md:h-12 md:justify-center"
            >
              <LogOut className="h-6 w-6 shrink-0" />
              <span className="text-base font-semibold md:hidden">Logout</span>
              <SidebarTooltip label="Logout" className="hidden md:block" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
