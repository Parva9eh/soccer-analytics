"use client";

import { RouteError } from "@/components/ui/route-error";

export default function MatchesError({
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
      title="Matches unavailable"
      fallbackMessage="Something went wrong while loading the matches section."
      backHref="/"
      backLabel="Back to dashboard"
    />
  );
}