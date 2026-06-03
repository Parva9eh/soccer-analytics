"use client";

import type { ReactNode } from "react";

interface PitchFrameProps {
  children: ReactNode;
  mode: "2d" | "3d";
  className?: string;
}

/**
 * Shared broadcast-style frame around 2D/3D pitch views.
 */
export function PitchFrame({ children, mode, className = "" }: PitchFrameProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-600/50 bg-gradient-to-b from-[#0c1929] via-[#071018] to-[#040a10] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}
    >
      {/* Stadium roof truss hint (long sides) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-slate-900/90 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-black/80 to-transparent"
        aria-hidden
      />

      {/* Corner floodlight glow */}
      <div className="pointer-events-none absolute left-0 top-0 z-0 h-32 w-32 rounded-full bg-amber-200/8 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute right-0 top-0 z-0 h-32 w-32 rounded-full bg-amber-200/8 blur-3xl" aria-hidden />

      {/* Mode badge */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2 rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-300 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        {mode === "3d" ? "Stadium 3D" : "Broadcast 2D"}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-20 text-[9px] font-medium tracking-wide text-slate-500">
        FIFA 105×68m
      </div>

      <div className="relative z-[1]">{children}</div>
    </div>
  );
}