"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function FilterTabs({
  items,
  param = "status",
  basePath,
  className,
}: {
  items: { label: string; value: string; count?: number }[];
  param?: string;
  basePath: string;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get(param) ?? "";

  return (
    <div className={cn("no-scrollbar flex gap-1 overflow-x-auto rounded-lg border border-white/[0.07] bg-black/30 p-1", className)}>
      {items.map((item) => {
        const params = new URLSearchParams(searchParams.toString());
        if (item.value) params.set(param, item.value);
        else params.delete(param);
        params.delete("page");
        const href = `${basePath || pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        const isActive = active === item.value;
        return (
          <Link
            key={item.value || "all"}
            href={href}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.16em] transition-colors",
              isActive
                ? "bg-gradient-to-r from-rjnx-blue/25 to-rjnx-purple/25 text-white shadow-[inset_0_0_0_1px_rgba(0,207,255,0.35)]"
                : "text-white/50 hover:bg-white/5 hover:text-white/80",
            )}
          >
            {item.label}
            {typeof item.count === "number" ? <span className="ml-1.5 text-white/40">{item.count}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-md border border-white/10 bg-black/40 p-0.5", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded px-3 py-1 font-display text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
            value === option.value ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
