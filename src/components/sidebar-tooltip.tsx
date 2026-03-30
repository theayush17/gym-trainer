"use client";

type SidebarTooltipProps = {
  label: string;
};

export function SidebarTooltip({ label }: SidebarTooltipProps) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
      {label}
    </span>
  );
}
