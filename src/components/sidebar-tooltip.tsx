"use client";

type SidebarTooltipProps = {
  label: string;
};

export function SidebarTooltip({ label }: SidebarTooltipProps) {
  return (
    <span className="pointer-events-none absolute left-full ml-2 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity duration-200 shadow-xl group-hover:opacity-100">
      {label}
    </span>
  );
}
