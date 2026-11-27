import * as React from "react";
import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  blue: "border-rjnx-blue/40 bg-rjnx-blue/10 text-rjnx-blue",
  purple: "border-rjnx-purple/40 bg-rjnx-purple/10 text-rjnx-purple",
  pink: "border-rjnx-pink/40 bg-rjnx-pink/10 text-rjnx-pink",
  red: "border-rjnx-red/40 bg-rjnx-red/10 text-rjnx-red",
  green: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  amber: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  neutral: "border-white/15 bg-white/5 text-white/70",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.16em]",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 animate-pulse rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, keyof typeof tones> = {
  draft: "neutral",
  published: "blue",
  registration_open: "green",
  registration_closed: "amber",
  live: "red",
  completed: "neutral",
  cancelled: "red",
  scheduled: "blue",
  room_published: "purple",
  awaiting_verification: "amber",
  verified: "green",
  disputed: "red",
  pending: "amber",
  approved: "green",
  rejected: "red",
  waitlisted: "purple",
  paid: "green",
  failed: "red",
  refunded: "neutral",
  created: "neutral",
  open: "blue",
  in_progress: "amber",
  resolved: "green",
  closed: "neutral",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = STATUS_TONES[status] ?? "neutral";
  const label = status.replace(/_/g, " ");
  return (
    <Badge tone={tone} dot={status === "live"} className={className}>
      {label}
    </Badge>
  );
}
