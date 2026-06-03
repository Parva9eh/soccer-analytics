/** Shared toolbar control styles for pitch/table event filters. */
export const eventFilterTriggerClass =
  "h-8 gap-2 border-slate-700 bg-slate-900/80 text-xs font-medium text-slate-200 shadow-none hover:bg-slate-800 hover:text-white focus-visible:ring-1 focus-visible:ring-slate-600 focus-visible:ring-offset-0 active:bg-slate-800 active:text-white data-[state=open]:bg-slate-800 data-[state=open]:text-white";

/** Popover panel — single surface; sections use divide-y (no stacked borders). */
export const eventFilterMenuClass =
  "w-[240px] overflow-hidden rounded-md border border-slate-700 bg-slate-900 p-0 text-slate-200 shadow-xl outline-none";

export const eventFilterMenuBodyClass =
  "flex flex-col divide-y divide-slate-700/80";

export const eventFilterMenuHeaderClass = "px-4 py-3";

export const eventFilterMenuListClass = "space-y-0.5 p-2";

export const eventFilterMenuRowClass =
  "flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-slate-600";

/** Checked (pitch) or selected (table) row — same highlight as hover. */
export const eventFilterMenuRowActiveClass = "bg-slate-800/80";

export const eventFilterMenuControlClass = "h-4 w-4 shrink-0 accent-teal-500";

export const eventFilterMenuDotClass = "h-2.5 w-2.5 shrink-0 rounded-full";

export const eventFilterMenuIconClass = "w-4 shrink-0 text-center text-slate-400";

export const eventFilterMenuLabelClass = "text-sm text-slate-100";

export const eventFilterMenuFooterClass =
  "flex items-center justify-between gap-2 px-4 py-2.5";

export const eventFilterMenuFooterActionClass =
  "text-xs text-slate-400 transition-colors hover:text-white";