import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import type { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileHeader />
        <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
      </div>
    </div>
  );
}