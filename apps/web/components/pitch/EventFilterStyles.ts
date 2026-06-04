/** Shared toolbar control styles for pitch/table event filters. */
export const eventFilterTriggerClass =
  "h-8 gap-2 border-border bg-card/90 text-xs font-medium text-foreground shadow-none hover:bg-secondary hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 active:bg-secondary data-[state=open]:bg-secondary data-[state=open]:text-foreground";

export const eventFilterMenuClass =
  "w-[240px] overflow-hidden rounded-md border border-border bg-background p-0 text-foreground shadow-xl outline-none";

export const eventFilterMenuBodyClass =
  "flex flex-col divide-y divide-border/80";

export const eventFilterMenuHeaderClass = "px-4 py-3";

export const eventFilterMenuListClass = "space-y-0.5 p-2";

export const eventFilterMenuRowClass =
  "flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring";

export const eventFilterMenuRowActiveClass = "bg-secondary/80";

export const eventFilterMenuControlClass = "h-4 w-4 shrink-0 accent-primary";

export const eventFilterMenuDotClass = "h-2.5 w-2.5 shrink-0 rounded-full";

export const eventFilterMenuIconClass = "w-4 shrink-0 text-center text-muted-foreground";

export const eventFilterMenuLabelClass = "text-sm text-foreground";

export const eventFilterMenuFooterClass =
  "flex items-center justify-between gap-2 px-4 py-2.5";

export const eventFilterMenuFooterActionClass =
  "text-xs text-muted-foreground transition-colors hover:text-foreground";