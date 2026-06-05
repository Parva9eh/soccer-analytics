"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Users, BarChart3, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AUTH_ENABLED } from "@/lib/auth-config";

const baseNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/matches", label: "Matches", icon: Calendar },
  { href: "/players", label: "Players", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export const navItems = AUTH_ENABLED
  ? [
      ...baseNavItems,
      { href: "/settings", label: "Workspaces", icon: Building2 },
    ]
  : [...baseNavItems];

interface NavLinksProps {
  onLinkClick?: () => void;
  className?: string;
}

export function NavLinks({ onLinkClick, className = "" }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href + "/"));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/15 text-foreground ring-1 ring-primary/25"
                : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
            )}
          >
            <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}