import { LogoMark } from "@/components/site/logo";
import { cn } from "@/lib/utils";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass hud-corners w-full max-w-md rounded-xl p-7", className)}>
      <div className="flex items-center gap-3">
        <LogoMark size={38} />
        <div>
          <p className="font-display text-[9px] font-bold uppercase tracking-[0.34em] text-rjnx-blue">{eyebrow}</p>
          <h1 className="font-display text-lg font-black uppercase tracking-[0.12em] text-white">{title}</h1>
        </div>
      </div>
      {description ? <p className="mt-4 text-sm text-rjnx-muted">{description}</p> : null}
      <div className="mt-6">{children}</div>
      {footer ? <div className="mt-6 border-t border-white/[0.07] pt-4 text-sm text-rjnx-muted">{footer}</div> : null}
    </div>
  );
}
