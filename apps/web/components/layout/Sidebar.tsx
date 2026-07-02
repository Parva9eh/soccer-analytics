"use client";

import { BrandLockup } from "@/components/brand/BrandLockup";
import { NavLinks } from "./NavLinks";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { SidebarWorkspace } from "@/components/layout/SidebarWorkspace";
import { AUTH_ENABLED } from "@/lib/auth-config";

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <BrandLockup subtitle="La Liga 2020/21 demo" />
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