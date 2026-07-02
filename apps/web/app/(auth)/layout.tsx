import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/LogoMark";
import { AUTH_ENABLED } from "@/lib/auth-config";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <p className="text-caption mb-6 max-w-md text-center text-muted-foreground">
        {AUTH_ENABLED
          ? "Browse matches and players without signing in, or sign in for workspaces and saved views."
          : "Auth is optional in local dev — the app works without signing in."}{" "}
        <Link
          href="/"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Continue browsing
        </Link>
      </p>
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <LogoMark size={48} />
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Soccer Analytics
        </p>
        <p className="text-[10px] text-muted-foreground">
          Event-level intelligence
        </p>
      </div>
      {children}
    </div>
  );
}