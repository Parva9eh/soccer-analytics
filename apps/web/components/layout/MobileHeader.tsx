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
      {/* Mobile Top Bar - Premium feel */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center border-b border-slate-700/70 bg-slate-900/95 px-4 backdrop-blur-md md:hidden">
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
          <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-white truncate">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[260px] bg-slate-900 p-0 border-r border-slate-700">
          <SheetHeader className="border-b border-slate-700 bg-slate-950 px-6 py-5">
            <SheetTitle className="text-left text-xl font-semibold tracking-tight text-white flex items-center gap-2">
              <span>Soccer Analytics</span>
            </SheetTitle>
          </SheetHeader>

          <div className="p-3 pt-2">
            <NavLinks onLinkClick={() => setOpen(false)} />
          </div>

          <div className="mt-auto border-t border-slate-700 p-4 text-[10px] text-slate-500 tracking-wider">
            v0.2.0 • La Liga 2020/21
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
