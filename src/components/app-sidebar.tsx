"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { CreditCard, FileText, FolderKanban, Home, Info, Lock, LogOut, PlusSquare, Settings, User, Users, Dumbbell } from "lucide-react";
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
        { href: "/profile", path: "/profile", label: "Profile", icon: User },
        { href: "/settings", path: "/settings", label: "Settings", icon: Settings },
        { href: "/about", path: "/about", label: "About Us", icon: Info },
        { href: "/terms", path: "/terms", label: "Terms & Conditions", icon: FileText },
        { href: "/privacy", path: "/privacy", label: "Privacy Policy", icon: Lock }
      ]
    : [
        { href: "/dashboard", path: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/plans?upgrade=1", path: "/plans", label: "Plans", icon: CreditCard },
        { href: "/profile", path: "/profile", label: "Profile", icon: User },
        { href: "/settings", path: "/settings", label: "Settings", icon: Settings },
        { href: "/about", path: "/about", label: "About Us", icon: Info },
        { href: "/terms", path: "/terms", label: "Terms & Conditions", icon: FileText },
        { href: "/privacy", path: "/privacy", label: "Privacy Policy", icon: Lock }
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
        className={`fixed left-0 top-0 z-50 flex h-screen w-16 flex-col items-center justify-between border-r border-gray-800 bg-gray-950 px-2 py-6 transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <Link
            href={isAdmin ? "/admin" : "/dashboard"}
            onClick={onClose}
            className="group relative flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white"
          >
            <Dumbbell className="h-4 w-4" />
            <SidebarTooltip label="Gym Trainer" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-400 hover:text-white md:hidden"
          >
            <span className="sr-only">Close navigation</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col items-center gap-6 py-6">
          {navItems.map((item) => {
            const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="group relative flex flex-col items-center"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl transition ${
                    active
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:scale-110 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {active ? <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white" /> : <span className="mt-1 h-1.5 w-1.5 rounded-full bg-transparent" />}
                <SidebarTooltip label={item.label} />
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={onLogout}
            className="group relative flex h-12 w-12 items-center justify-center rounded-xl text-gray-400 transition hover:scale-110 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <SidebarTooltip label="Logout" />
          </button>

          <Link
            href="/profile"
            onClick={onClose}
            className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
          >
            {userInitial}
            <SidebarTooltip label={profileName || "Profile"} />
          </Link>
        </div>
      </aside>
    </>
  );
}
