import { cn } from "@/lib/utils";

export function PanelSkeleton({
  className,
  height = "h-56",
}: {
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={cn(
        "surface-card animate-pulse rounded-xl border bg-muted/20",
        height,
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function StatGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4",
        className,
      )}
      role="status"
      aria-label="Loading metrics"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="surface-card h-[7.5rem] animate-pulse rounded-xl border bg-muted/20"
        />
      ))}
    </div>
  );
}

export function InlineLoadingNotice({ label = "Loading…" }: { label?: string }) {
  return (
    <p className="text-caption flex items-center gap-2 text-muted-foreground" role="status">
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      {label}
    </p>
  );
}