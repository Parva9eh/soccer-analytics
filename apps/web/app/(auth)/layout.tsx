import Link from "next/link";
import type { ReactNode } from "react";
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
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold text-primary"
          aria-hidden
        >
          SA
        </div>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Soccer Analytics
        </p>
      </div>
      {children}
    </div>
  );
}