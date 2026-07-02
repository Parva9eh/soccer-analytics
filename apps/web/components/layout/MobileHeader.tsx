"use client";

import { useState } from "react";
import { Menu, ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { NavLinks } from "./NavLinks";
import { SidebarUser } from "./SidebarUser";
import { SidebarWorkspace } from "./SidebarWorkspace";
import { AUTH_ENABLED } from "@/lib/auth-config";

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/players/")) return "Player Detail";
  if (pathname.startsWith("/matches/")) return "Match Detail";
  if (pathname === "/players") return "Players";
  if (pathname === "/matches") return "Matches";
  if (pathname === "/analytics") return "Analytics";
  return "Dashboard";
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isDetailPage =
    pathname.startsWith("/players/") || pathname.startsWith("/matches/");
  const pageTitle = getPageTitle(pathname);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center border-b border-border bg-card/95 px-4 backdrop-blur-md md:hidden">
        {isDetailPage ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="mr-2 -ml-2"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="mr-2 -ml-2"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
          {pageTitle}
        </h1>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[260px] border-border bg-card p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-left">
              <BrandLockup subtitle="La Liga 2020/21 demo" />
            </SheetTitle>
          </SheetHeader>

          <div className="p-3">
            <NavLinks onLinkClick={() => setOpen(false)} />
          </div>

          <div className="mt-auto space-y-3 border-t border-border p-4">
            {AUTH_ENABLED && <SidebarWorkspace />}
            <SidebarUser />
            <p className="text-caption">v0.3.0 • Event-level data</p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}