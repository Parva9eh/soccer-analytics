import { MainAppShell } from "@/components/layout/MainAppShell";
import type { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return <MainAppShell>{children}</MainAppShell>;
}