"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { AuthGate } from "@/components/auth/AuthGate";
import { BootstrapOnSignIn } from "@/components/auth/BootstrapOnSignIn";
import { GuestBrowsingBanner } from "@/components/auth/GuestBrowsingBanner";
import type { ReactNode } from "react";

export function MainAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileHeader />
        <main className="flex-1 overflow-auto pt-14 md:pt-0">
          <AuthGate>
            <BootstrapOnSignIn />
            <GuestBrowsingBanner />
            {children}
          </AuthGate>
        </main>
      </div>
    </div>
  );
}