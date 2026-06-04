"use client";

import Link from "next/link";
import { RouteError } from "@/components/ui/route-error";
import { Button } from "@/components/ui/button";

export default function PlayerDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Player could not load"
      fallbackMessage="The player profile failed to render."
      backHref="/players"
      backLabel="Back to players"
      extraAction={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">Dashboard</Link>
        </Button>
      }
    />
  );
}