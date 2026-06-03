"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EventFilterTrigger } from "./EventFilterTrigger";
import {
  eventFilterMenuBodyClass,
  eventFilterMenuClass,
  eventFilterMenuHeaderClass,
  eventFilterMenuListClass,
} from "./EventFilterStyles";

interface EventFilterPopoverShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel: string;
  triggerBadge?: string;
  triggerAriaLabel: string;
  title: string;
  description: string;
  listRole?: "list" | "listbox";
  listAriaLabel?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** Shared popover chrome for pitch layers and table filter menus. */
export function EventFilterPopoverShell({
  open,
  onOpenChange,
  triggerLabel,
  triggerBadge,
  triggerAriaLabel,
  title,
  description,
  listRole = "list",
  listAriaLabel,
  footer,
  children,
}: EventFilterPopoverShellProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <EventFilterTrigger
          label={triggerLabel}
          badge={triggerBadge}
          open={open}
          aria-label={triggerAriaLabel}
        />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        data-event-filter-menu
        className={cn(
          eventFilterMenuClass,
          "border-slate-700 bg-slate-900 text-slate-200",
        )}
      >
        <div className={eventFilterMenuBodyClass}>
          <div className={eventFilterMenuHeaderClass}>
            <p className="text-sm font-medium text-white">{title}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{description}</p>
          </div>

          <ul
            data-event-filter-list
            className={eventFilterMenuListClass}
            role={listRole}
            aria-label={listAriaLabel}
          >
            {children}
          </ul>

          {footer}
        </div>
      </PopoverContent>
    </Popover>
  );
}