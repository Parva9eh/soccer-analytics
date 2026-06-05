"use client";

import { EVENT_TYPES, getEventColor, getEventIcon } from "./utils";
import { EventFilterPopoverShell } from "./EventFilterPopoverShell";
import { EventFilterTypeRow } from "./EventFilterTypeRow";
import {
  eventFilterMenuFooterActionClass,
  eventFilterMenuFooterClass,
} from "./EventFilterStyles";

interface PitchLayersPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleTypes: string[];
  onToggleType: (type: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function PitchLayersPopover({
  open,
  onOpenChange,
  visibleTypes,
  onToggleType,
  onSelectAll,
  onClearAll,
}: PitchLayersPopoverProps) {
  const activeCount = visibleTypes.length;
  const totalCount = EVENT_TYPES.length;

  return (
    <EventFilterPopoverShell
      open={open}
      onOpenChange={onOpenChange}
      triggerLabel="Pitch layers"
      triggerBadge={`${activeCount}/${totalCount}`}
      triggerAriaLabel="Toggle event layers on pitch"
      title="Visible on pitch"
      description="Toggle which events appear on the pitch and timeline."
      footer={
        <div className={eventFilterMenuFooterClass}>
          <button
            type="button"
            onClick={onSelectAll}
            className={eventFilterMenuFooterActionClass}
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className={eventFilterMenuFooterActionClass}
          >
            Clear all
          </button>
        </div>
      }
    >
      {EVENT_TYPES.map((type) => (
        <EventFilterTypeRow
          key={type}
          mode="checkbox"
          checked={visibleTypes.includes(type)}
          onChange={() => onToggleType(type)}
          label={type}
          color={getEventColor(type)}
          icon={getEventIcon(type)}
          ariaLabel={`${type} on pitch`}
        />
      ))}
    </EventFilterPopoverShell>
  );
}