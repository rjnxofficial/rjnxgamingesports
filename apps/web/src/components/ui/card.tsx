import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  glow = false,
  hud = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { glow?: boolean; hud?: boolean }) {
  return (
    <div
      className={cn(
        "glass relative rounded-xl",
        hud && "hud-corners",
        glow && "neon-border",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-sm font-bold uppercase tracking-[0.16em] text-white", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-rjnx-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-3 p-5 pt-0", className)} {...props} />;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "blue",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "blue" | "purple" | "pink" | "red" | "green";
}) {
  const accents: Record<string, string> = {
    blue: "from-rjnx-blue/20 text-rjnx-blue",
    purple: "from-rjnx-purple/20 text-rjnx-purple",
    pink: "from-rjnx-pink/20 text-rjnx-pink",
    red: "from-rjnx-red/20 text-rjnx-red",
    green: "from-emerald-400/20 text-emerald-300",
  };
  return (
    <Card className="overflow-hidden p-5">
      <div className={cn("pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br to-transparent blur-2xl", accents[accent])} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.2em] text-rjnx-muted">{label}</p>
          <p className="mt-2 font-display text-2xl font-black text-white">{value}</p>
          {hint ? <p className="mt-1 text-xs text-rjnx-muted">{hint}</p> : null}
        </div>
        {icon ? <div className={cn("rounded-lg border border-white/10 bg-white/5 p-2", accents[accent])}>{icon}</div> : null}
      </div>
    </Card>
  );
}
