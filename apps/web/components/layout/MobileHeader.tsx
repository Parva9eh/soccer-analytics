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
import { NavLinks } from "./NavLinks";

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

  const isDetailPage = pathname.startsWith("/players/") || pathname.startsWith("/matches/");
  const pageTitle = getPageTitle(pathname);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b border-slate-700 bg-slate-900 px-4 shadow-sm md:hidden">
        {isDetailPage ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="mr-2 -ml-2 h-10 w-10 text-slate-300 hover:text-white active:bg-slate-800 active:scale-[0.96] transition-transform"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="mr-2 -ml-2 h-10 w-10 text-slate-300 hover:text-white active:bg-slate-800 active:scale-[0.96] transition-transform"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex-1 min-w-0 pr-2">
          <h1 className="text-[17px] font-semibold tracking-tight text-white truncate">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[260px] bg-slate-900 p-0">
          <SheetHeader className="border-b border-slate-700 bg-slate-950/60 px-6 py-4">
            <SheetTitle className="text-left text-lg font-semibold tracking-tight text-white">
              Menu
            </SheetTitle>
          </SheetHeader>

          <div className="p-4 pt-2 pb-6">
            <NavLinks onLinkClick={() => setOpen(false)} />
          </div>

          <div className="border-t border-slate-700 p-4 text-xs text-slate-400">
            v0.2.0 • La Liga 2020/21
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
