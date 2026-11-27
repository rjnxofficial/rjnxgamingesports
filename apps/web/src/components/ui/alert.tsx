import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  info: { icon: Info, className: "border-rjnx-blue/30 bg-rjnx-blue/[0.07] text-rjnx-blue" },
  success: { icon: CheckCircle2, className: "border-emerald-400/30 bg-emerald-400/[0.07] text-emerald-300" },
  warning: { icon: AlertTriangle, className: "border-amber-400/30 bg-amber-400/[0.07] text-amber-300" },
  error: { icon: ShieldAlert, className: "border-rjnx-red/35 bg-rjnx-red/[0.08] text-rjnx-red" },
} as const;

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: keyof typeof VARIANTS;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: variantClass } = VARIANTS[variant];
  return (
    <div className={cn("flex gap-3 rounded-md border px-4 py-3 text-sm", variantClass, className)} role="alert">
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        {title ? <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em]">{title}</p> : null}
        {children ? <div className="text-white/75">{children}</div> : null}
      </div>
    </div>
  );
}
