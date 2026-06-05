import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
  loading,
}: StatCardProps) {
  return (
    <Card className={cn("surface-card card-interactive", className)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-label">{label}</p>
            {loading ? (
              <div className="mt-2 h-9 w-24 animate-pulse rounded-md bg-muted/40" />
            ) : (
              <p className="metric-value text-3xl text-foreground">{value}</p>
            )}
            {hint && !loading && (
              <p className="text-caption text-muted-foreground">{hint}</p>
            )}
          </div>
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}