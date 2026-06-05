"use client";

import { getEventColor, getEventIcon } from "./utils";
import { EventFilterPopoverShell } from "./EventFilterPopoverShell";
import { EventFilterTypeRow } from "./EventFilterTypeRow";

interface TableEventFilterPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedType: string;
  eventTypes: string[];
  onSelect: (type: string) => void;
  filteredCount: number | null;
  totalCount: number | null;
}

function formatCountBadge(
  filtered: number | null,
  total: number | null,
): string {
  if (filtered == null || total == null) return "—/—";
  return `${filtered.toLocaleString()}/${total.toLocaleString()}`;
}

export function TableEventFilterPopover({
  open,
  onOpenChange,
  selectedType,
  eventTypes,
  onSelect,
  filteredCount,
  totalCount,
}: TableEventFilterPopoverProps) {
  const badge = formatCountBadge(filteredCount, totalCount);

  const handleSelect = (type: string) => {
    onSelect(type);
    onOpenChange(false);
  };

  return (
    <EventFilterPopoverShell
      open={open}
      onOpenChange={onOpenChange}
      triggerLabel="Table filter"
      triggerBadge={badge}
      triggerAriaLabel="Filter events in table"
      title="Filter table"
      description="Show one event type or all types in the table."
      listAriaLabel="Event type filter"
    >
      <EventFilterTypeRow
        mode="option"
        selected={selectedType === "all"}
        onSelect={() => handleSelect("all")}
        label="All types"
        icon="◎"
        ariaLabel="All event types in table"
      />

      {eventTypes.map((type) => (
        <EventFilterTypeRow
          key={type}
          mode="option"
          selected={selectedType === type}
          onSelect={() => handleSelect(type)}
          label={type}
          color={getEventColor(type)}
          icon={getEventIcon(type)}
          ariaLabel={`${type} in table`}
        />
      ))}
    </EventFilterPopoverShell>
  );
}