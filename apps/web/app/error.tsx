"use client";

import { useEffect } from "react";
import Link from "next/link";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { PageShell } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <QueryErrorState
        error={error}
        title="Something went wrong"
        fallbackMessage="An unexpected error occurred while loading this page."
        onRetry={reset}
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Back to dashboard</Link>
          </Button>
        }
      />
    </PageShell>
  );
}