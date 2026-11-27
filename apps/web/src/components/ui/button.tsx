import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display text-xs font-bold uppercase tracking-[0.18em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rjnx-blue/60 focus-visible:ring-offset-2 focus-visible:ring-offset-rjnx-bg [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-rjnx-blue via-rjnx-purple to-rjnx-pink text-black shadow-[0_0_28px_-8px_rgba(0,207,255,0.85)] hover:shadow-[0_0_36px_-4px_rgba(255,46,209,0.7)] hover:brightness-110 active:brightness-95",
        secondary:
          "border border-white/10 bg-white/[0.04] text-white hover:border-rjnx-blue/50 hover:bg-white/[0.08] hover:text-rjnx-blue",
        outline:
          "border border-rjnx-blue/40 bg-transparent text-rjnx-blue hover:bg-rjnx-blue/10 hover:shadow-[0_0_24px_-8px_rgba(0,207,255,0.8)]",
        ghost: "text-white/70 hover:bg-white/5 hover:text-white",
        danger:
          "border border-rjnx-red/50 bg-rjnx-red/10 text-rjnx-red hover:bg-rjnx-red/20 hover:shadow-[0_0_24px_-8px_rgba(255,59,59,0.8)]",
        success:
          "border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20",
        link: "text-rjnx-blue underline-offset-4 hover:underline normal-case tracking-normal",
      },
      size: {
        sm: "h-8 px-3 text-[10px]",
        md: "h-10 px-5",
        lg: "h-12 px-8 text-sm",
        icon: "size-10",
        none: "",
      },
      shape: {
        default: "rounded-md",
        pill: "rounded-full",
        hud: "clip-hud rounded-none",
      },
    },
    defaultVariants: { variant: "primary", size: "md", shape: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, shape }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
