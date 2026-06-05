"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { parseQueryError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QueryErrorStateProps {
  error: unknown;
  title?: string;
  fallbackMessage?: string;
  onRetry?: () => void;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function QueryErrorState({
  error,
  title,
  fallbackMessage,
  onRetry,
  action,
  className,
  compact = false,
}: QueryErrorStateProps) {
  const parsed = parseQueryError(error, fallbackMessage);

  return (
    <Card className={cn("surface-card", className)}>
      <CardContent className={cn(compact ? "py-6" : "py-10")}>
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-4">
          <div className="mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive sm:mb-0">
            <AlertCircle className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {title ?? parsed.title}
              </h3>
              <p className="text-caption mt-1">{parsed.message}</p>
            </div>
            {(parsed.code || parsed.requestId) && (
              <p className="font-mono-data text-[10px] text-muted-foreground">
                {parsed.code && <span>{parsed.code}</span>}
                {parsed.code && parsed.requestId && (
                  <span className="mx-1.5 text-border">·</span>
                )}
                {parsed.requestId && (
                  <span>Request {parsed.requestId}</span>
                )}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {onRetry && (
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Try again
                </Button>
              )}
              {action}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}