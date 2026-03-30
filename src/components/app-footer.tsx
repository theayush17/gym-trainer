"use client";

import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "About Us" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" }
];

export function AppFooter() {
  return (
    <footer className="w-full max-w-full bg-gray-950 px-4 py-4 text-center text-sm text-gray-400 transition-colors duration-300 dark:bg-gray-950 md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-3">
        <p>© 2026 All Rights Reserved</p>
        <div className="flex flex-wrap justify-center gap-4">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href} className="underline transition-colors duration-200 hover:text-white">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
