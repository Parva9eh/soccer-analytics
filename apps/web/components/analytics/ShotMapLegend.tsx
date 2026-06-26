import { SHOT_OUTCOME_LEGEND } from "@/lib/shot-utils";

export function ShotMapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
      <span className="normal-case tracking-normal">Outcome</span>
      {SHOT_OUTCOME_LEGEND.map(({ label, color }) => (
        <span key={label} className="inline-flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          {label}
        </span>
      ))}
      <span className="border-l border-border pl-2 normal-case tracking-normal">
        Size = xG
      </span>
    </div>
  );
}