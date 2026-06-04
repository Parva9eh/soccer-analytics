import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  /** Constrain width on wide detail views (e.g. match page). */
  wide?: boolean;
}

export function PageShell({ children, className, wide }: PageShellProps) {
  return (
    <div
      className={cn(
        "content w-full min-w-0",
        wide && "max-w-7xl",
        className,
      )}
    >
      {children}
    </div>
  );
}