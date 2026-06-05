"use client";

import { useEffect } from "react";
import Link from "next/link";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { PageShell } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";

export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  fallbackMessage: string;
  backHref: string;
  backLabel: string;
  /** Extra link or control shown next to the back navigation. */
  extraAction?: React.ReactNode;
}

export function RouteError({
  error,
  reset,
  title,
  fallbackMessage,
  backHref,
  backLabel,
  extraAction,
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <QueryErrorState
        error={error}
        title={title}
        fallbackMessage={fallbackMessage}
        onRetry={reset}
        action={
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href={backHref}>{backLabel}</Link>
            </Button>
            {extraAction}
          </>
        }
      />
    </PageShell>
  );
}