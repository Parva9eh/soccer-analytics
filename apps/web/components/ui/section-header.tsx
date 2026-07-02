import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-section-title">{title}</h2>
        {description && (
          <p className="text-caption text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="-mx-1 w-full min-w-0 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:w-auto sm:overflow-visible sm:pb-0">
          <div className="flex min-w-max flex-wrap items-center gap-2 sm:min-w-0 sm:justify-end">
            {action}
          </div>
        </div>
      )}
    </div>
  );
}