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
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle className="text-left text-lg font-semibold tracking-tight">
              Soccer Analytics
            </SheetTitle>
          </SheetHeader>

          <div className="p-3">
            <NavLinks onLinkClick={() => setOpen(false)} />
          </div>

          <div className="mt-auto border-t border-border p-4 text-caption">
            v0.2.0 • La Liga 2020/21
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}