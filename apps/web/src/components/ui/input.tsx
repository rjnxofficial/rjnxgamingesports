import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30",
        "transition-colors focus-visible:border-rjnx-blue/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rjnx-blue/25",
        "disabled:cursor-not-allowed disabled:opacity-50 file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-xs file:text-white",
        "aria-[invalid=true]:border-rjnx-red/60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-24 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30",
        "transition-colors focus-visible:border-rjnx-blue/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rjnx-blue/25",
        "aria-[invalid=true]:border-rjnx-red/60",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full appearance-none rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white",
        "transition-colors focus-visible:border-rjnx-blue/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rjnx-blue/25",
        "aria-[invalid=true]:border-rjnx-red/60 [&>option]:bg-rjnx-surface",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-rjnx-pink"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-rjnx-red">{error}</p> : hint ? <p className="text-xs text-rjnx-muted">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2 text-sm text-white/80", className)}>
      <input
        type="checkbox"
        className="size-4 rounded border-white/20 bg-black/50 accent-rjnx-blue"
        {...props}
      />
      {label}
    </label>
  );
}
