"use client";

import { NavLinks } from "./NavLinks";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { SidebarWorkspace } from "@/components/layout/SidebarWorkspace";
import { AUTH_ENABLED } from "@/lib/auth-config";

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold text-primary"
          aria-hidden
        >
          SA
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
            Soccer Analytics
          </h1>
          <p className="text-[10px] text-muted-foreground">La Liga 2020/21</p>
        </div>
      </div>

      <div className="flex-1 p-3">
        <NavLinks />
      </div>

      <div className="space-y-2 border-t border-border p-4">
        {AUTH_ENABLED && <SidebarWorkspace />}
        <SidebarUser />
        <p className="text-caption">v0.3.0 • Event-level data</p>
      </div>
    </aside>
  );
}