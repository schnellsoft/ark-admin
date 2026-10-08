import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" | "destructive" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        "bg-teal-900/60 text-teal-200",
        className,
      )}
      {...props}
    />
  );
}
