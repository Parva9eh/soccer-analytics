"use client";

import { RouteError } from "@/components/ui/route-error";

export default function PlayersError({
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
      title="Players unavailable"
      fallbackMessage="Something went wrong while loading the players section."
      backHref="/"
      backLabel="Back to dashboard"
    />
  );
}