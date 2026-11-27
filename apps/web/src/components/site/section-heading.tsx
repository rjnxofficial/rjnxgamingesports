import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {eyebrow ? (
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.32em] text-rjnx-blue">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1.5 font-display text-xl font-black uppercase tracking-[0.06em] text-white sm:text-2xl">
          {title}
        </h2>
        {description ? <p className="mt-1.5 max-w-xl text-sm text-rjnx-muted">{description}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="group inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-rjnx-blue hover:text-white"
        >
          {action.label}
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
        </Link>
      ) : null}
    </div>
  );
}
