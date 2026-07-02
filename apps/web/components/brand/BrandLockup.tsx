import { LogoMark } from "@/components/brand/LogoMark";
import { cn } from "@/lib/utils";

interface BrandLockupProps {
  subtitle?: string;
  className?: string;
  compact?: boolean;
}

export function BrandLockup({
  subtitle = "Event-level intelligence",
  className,
  compact = false,
}: BrandLockupProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <LogoMark size={compact ? 28 : 32} />
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-semibold tracking-tight text-foreground",
            compact ? "text-sm" : "text-sm",
          )}
        >
          Soccer Analytics
        </p>
        {subtitle ? (
          <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}