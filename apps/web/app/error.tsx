"use client";

import { RouteError } from "@/components/ui/route-error";

export default function GlobalError({
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
      title="Something went wrong"
      fallbackMessage="An unexpected error occurred while loading this page."
      backHref="/"
      backLabel="Back to dashboard"
    />
  );
}