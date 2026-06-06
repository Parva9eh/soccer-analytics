"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BarChart3,
  Building2,
  Bookmark,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AUTH_ENABLED } from "@/lib/auth-config";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const exploreItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/matches", label: "Matches", icon: Calendar },
  { href: "/players", label: "Players", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const libraryItems: NavItem[] = [
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/analyses", label: "Match views", icon: Bookmark },
];

const workspaceItem: NavItem = {
  href: "/settings",
  label: "Workspaces",
  icon: Building2,
};

export const navItems: NavItem[] = AUTH_ENABLED
  ? [...exploreItems, ...libraryItems, workspaceItem]
  : exploreItems;

interface NavLinksProps {
  onLinkClick?: () => void;
  className?: string;
}

function NavSection({
  label,
  first,
  children,
}: {
  label: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p
        className={cn(
          "px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
          first ? "pt-0" : "pt-3",
        )}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function NavLink({
  item,
  isActive,
  onLinkClick,
}: {
  item: NavItem;
  isActive: boolean;
  onLinkClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
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
}

export function NavLinks({ onLinkClick, className = "" }: NavLinksProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/" && pathname.startsWith(href + "/"));

  if (!AUTH_ENABLED) {
    return (
      <nav className={cn("flex flex-col gap-0.5", className)}>
        {exploreItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            onLinkClick={onLinkClick}
          />
        ))}
      </nav>
    );
  }

  return (
    <nav className={cn("flex flex-col", className)}>
      <NavSection label="Explore" first>
        {exploreItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            onLinkClick={onLinkClick}
          />
        ))}
      </NavSection>

      <NavSection label="Library">
        {libraryItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            onLinkClick={onLinkClick}
          />
        ))}
      </NavSection>

      <div className="mt-2 border-t border-border pt-2">
        <NavLink
          item={workspaceItem}
          isActive={isActive(workspaceItem.href)}
          onLinkClick={onLinkClick}
        />
      </div>
    </nav>
  );
}