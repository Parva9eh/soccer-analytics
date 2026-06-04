import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
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