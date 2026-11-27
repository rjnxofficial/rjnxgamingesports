import { cn } from "@/lib/utils";

export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rjnx-mark" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00CFFF" />
          <stop offset="0.5" stopColor="#8B5CFF" />
          <stop offset="1" stopColor="#FF2ED1" />
        </linearGradient>
      </defs>
      <path
        d="M32 2 58 17v30L32 62 6 47V17L32 2Z"
        fill="#05050A"
        stroke="url(#rjnx-mark)"
        strokeWidth="2.5"
      />
      <path d="M20 45V19h10.5c5 0 8 2.9 8 7.4 0 3.4-1.8 5.8-4.8 6.7L40 45h-6.4l-5.3-10.2H26V45h-6Zm6-15.2h4c2 0 3.2-1.1 3.2-3s-1.2-3-3.2-3h-4v6Z" fill="url(#rjnx-mark)" />
      <path d="M43 19h6v9.5h-6zM43 33h6v12h-6z" fill="#FF2ED1" opacity="0.9" />
    </svg>
  );
}

export function Logo({
  className,
  compact = false,
  size = 36,
}: {
  className?: string;
  compact?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {compact ? null : (
        <span className="leading-none">
          <span className="block font-display text-[15px] font-black tracking-[0.22em] text-white">
            RJNX
          </span>
          <span className="mt-0.5 block font-display text-[8px] font-semibold tracking-[0.34em] text-rjnx-blue/80">
            GAMING ESPORTS
          </span>
        </span>
      )}
    </span>
  );
}
