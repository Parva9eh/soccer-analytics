"use client";

import { RouteError } from "@/components/ui/route-error";

export default function AnalyticsError({
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
      title="Analytics unavailable"
      fallbackMessage="Something went wrong while loading the analytics dashboard."
      backHref="/"
      backLabel="Back to dashboard"
    />
  );
}