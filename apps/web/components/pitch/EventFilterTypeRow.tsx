"use client";

import { cn } from "@/lib/utils";
import {
  eventFilterMenuControlClass,
  eventFilterMenuDotClass,
  eventFilterMenuIconClass,
  eventFilterMenuLabelClass,
  eventFilterMenuRowActiveClass,
  eventFilterMenuRowClass,
} from "./EventFilterStyles";

const NEUTRAL_DOT_COLOR = "#64748b"; // slate-500

interface EventFilterTypeRowBaseProps {
  label: string;
  color?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
}

interface EventFilterCheckboxRowProps extends EventFilterTypeRowBaseProps {
  mode: "checkbox";
  checked: boolean;
  onChange: () => void;
}

interface EventFilterOptionRowProps extends EventFilterTypeRowBaseProps {
  mode: "option";
  selected: boolean;
  onSelect: () => void;
}

export type EventFilterTypeRowProps =
  | EventFilterCheckboxRowProps
  | EventFilterOptionRowProps;

function RowContent({
  label,
  color,
  icon,
}: Pick<EventFilterTypeRowBaseProps, "label" | "color" | "icon">) {
  return (
    <>
      <span
        className={eventFilterMenuDotClass}
        style={{ backgroundColor: color ?? NEUTRAL_DOT_COLOR }}
        aria-hidden
      />
      <span className={eventFilterMenuIconClass} aria-hidden>
        {icon ?? ""}
      </span>
      <span className={eventFilterMenuLabelClass}>{label}</span>
    </>
  );
}

/** Shared row layout: pitch uses checkbox; table uses click-to-select (no radio). */
export function EventFilterTypeRow(props: EventFilterTypeRowProps) {
  const { label, color, icon, ariaLabel } = props;

  if (props.mode === "checkbox") {
    return (
      <li>
        <label
          className={cn(
            eventFilterMenuRowClass,
            "cursor-pointer has-[:checked]:bg-slate-800/80",
          )}
        >
          <input
            type="checkbox"
            checked={props.checked}
            onChange={props.onChange}
            className={eventFilterMenuControlClass}
            aria-label={ariaLabel ?? label}
          />
          <RowContent label={label} color={color} icon={icon} />
        </label>
      </li>
    );
  }

  return (
    <li aria-selected={props.selected}>
      <button
        type="button"
        role="option"
        onClick={props.onSelect}
        aria-label={ariaLabel ?? label}
        className={cn(
          eventFilterMenuRowClass,
          props.selected && eventFilterMenuRowActiveClass,
        )}
      >
        <RowContent label={label} color={color} icon={icon} />
      </button>
    </li>
  );
}