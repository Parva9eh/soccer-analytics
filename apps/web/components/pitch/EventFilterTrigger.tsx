"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventFilterTriggerClass } from "./EventFilterStyles";

interface EventFilterTriggerProps
  extends React.ComponentProps<typeof Button> {
  label: string;
  badge?: string;
  open: boolean;
}

/** Shared pitch/table filter toolbar trigger (label, optional badge, chevron). */
export const EventFilterTrigger = React.forwardRef<
  HTMLButtonElement,
  EventFilterTriggerProps
>(function EventFilterTrigger(
  { label, badge, open, className, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant="outline"
      size="sm"
      className={eventFilterTriggerClass}
      aria-expanded={open}
      {...props}
    >
      {label}
      {badge != null && badge !== "" && (
        <span className="rounded bg-slate-800 px-1.5 py-px text-[10px] tabular-nums text-slate-400">
          {badge}
        </span>
      )}
      <ChevronDown
        className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        aria-hidden
      />
    </Button>
  );
});
EventFilterTrigger.displayName = "EventFilterTrigger";