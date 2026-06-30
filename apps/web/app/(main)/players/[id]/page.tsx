"use client";


import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetchJson } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { PlayerSeasonStats } from "@/components/analytics/PlayerSeasonStats";

interface Player {
  id: number;
  name: string;
  position: string | null;
  jersey_number: number | null;
  nationality: string | null;
}

export default function PlayerDetailPage() {
  const params = useParams();
  const playerId = params.id ? Number(params.id) : null;

  const {
    data: player,
    isLoading,
    error,
    refetch,
  } = useQuery<Player>({
    queryKey: ["player", playerId],
    queryFn: () => apiFetchJson<Player>(`/players/${playerId}`),
    enabled: !!playerId,
  });



  const backButton = (
    <Button variant="ghost" className="mb-6 -ml-2 gap-2 sm:-ml-4" asChild>
      <Link href="/players">
        <ArrowLeft className="h-4 w-4" /> Back to players
      </Link>
    </Button>
  );

  if (isLoading) {
    return (
      <PageShell className="max-w-4xl">
        {backButton}
        <div className="mb-8 h-9 w-full max-w-xs animate-pulse rounded bg-muted/50" />
        <div className="mb-8 h-5 w-48 animate-pulse rounded bg-muted/50" />
        <Card className="surface-card">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="mb-2 h-3 w-20 animate-pulse rounded bg-muted/50" />
                  <div className="h-5 w-28 animate-pulse rounded bg-muted/50" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (error || !player) {
    return (
      <PageShell className="max-w-4xl">
        {backButton}
        <QueryErrorState
          error={error ?? new Error("Player not found")}
          title="Player not found"
          fallbackMessage="This player may not exist or could not be loaded."
          onRetry={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-4xl">
      {backButton}

      <div
        className="opacity-100"
      >
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-medium">
            {player.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div className="min-w-0">
            <h1 className="text-page-title break-words">{player.name}</h1>
            <p className="text-page-description">
              {player.position || "Position unknown"} ·{" "}
              {player.nationality || "Nationality unknown"}
            </p>
          </div>
        </div>

        <Card className="surface-card">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2">
              <div>
                <div className="text-label mb-1">Position</div>
                <div className="text-lg text-foreground">
                  {player.position || "—"}
                </div>
              </div>
              <div>
                <div className="text-label mb-1">Jersey number</div>
                <div className="metric-value text-lg">
                  {player.jersey_number ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-label mb-1">Nationality</div>
                <div className="text-lg text-foreground">
                  {player.nationality || "—"}
                </div>
              </div>
              <div>
                <div className="text-label mb-1">Player ID</div>
                <div className="font-mono-data text-lg">{player.id}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <PlayerSeasonStats playerId={player.id} position={player.position} />
      </div>
    </PageShell>
  );
}