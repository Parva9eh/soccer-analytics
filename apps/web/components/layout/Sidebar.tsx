"use client";

import { NavLinks } from "./NavLinks";

export function Sidebar() {
  return (
    <div className="hidden md:flex h-screen w-64 flex-col border-r border-slate-700 bg-slate-900">
      <div className="flex h-16 items-center border-b border-slate-700 px-6">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Soccer Analytics
        </h1>
      </div>

      <div className="flex-1 p-4">
        <NavLinks />
      </div>

      <div className="border-t border-slate-700 p-4 text-xs text-slate-400">
        v0.2.0 • La Liga 2020/21
      </div>
    </div>
  );
}
