"use client";

import Link from "next/link";
import { RouteError } from "@/components/ui/route-error";
import { Button } from "@/components/ui/button";

export default function MatchDetailError({
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
      title="Match could not load"
      fallbackMessage="The match view failed to render. This can happen if event or pitch data is malformed."
      backHref="/matches"
      backLabel="Back to matches"
      extraAction={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">Dashboard</Link>
        </Button>
      }
    />
  );
}