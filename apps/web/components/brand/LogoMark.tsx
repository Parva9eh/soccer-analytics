import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
  size?: number;
}

/** Soccer Analytics mark — pitch quadrant + event trajectory arc. */
export function LogoMark({ className, size = 32 }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="hsl(166 72% 36% / 0.15)" />
      <rect
        x="4"
        y="4"
        width="24"
        height="24"
        rx="5"
        stroke="hsl(166 72% 42%)"
        strokeWidth="1.25"
        fill="hsl(217 33% 12%)"
      />
      <path
        d="M4 16h24"
        stroke="hsl(166 55% 45% / 0.35)"
        strokeWidth="0.75"
      />
      <circle cx="16" cy="16" r="4" stroke="hsl(166 55% 45% / 0.5)" strokeWidth="0.75" />
      <path
        d="M8 24c4-6 8-8 12-8s8 2 12 8"
        stroke="hsl(166 72% 48%)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="26" cy="10" r="2.25" fill="hsl(166 72% 48%)" />
      <circle cx="26" cy="10" r="4.5" stroke="hsl(166 72% 48% / 0.35)" strokeWidth="0.75" />
    </svg>
  );
}