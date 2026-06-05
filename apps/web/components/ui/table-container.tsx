import { cn } from "@/lib/utils";

interface TableContainerProps {
  children: React.ReactNode;
  className?: string;
}

/** Horizontal scroll wrapper for data tables on small screens. */
export function TableContainer({ children, className }: TableContainerProps) {
  return (
    <div className={cn("table-scroll -mx-1 px-1 sm:mx-0 sm:px-0", className)}>
      {children}
    </div>
  );
}