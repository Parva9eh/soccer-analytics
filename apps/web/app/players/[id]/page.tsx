"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  } = useQuery<Player>({
    queryKey: ["player", playerId],
    queryFn: async () => {
      const res = await apiFetch(`/players/${playerId}`);
      if (!res.ok) throw new Error("Failed to fetch player");
      return res.json();
    },
    enabled: !!playerId,
  });

  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (player) {
      const timer = setTimeout(() => setContentVisible(true), 10);
      return () => clearTimeout(timer);
    }
    setContentVisible(false);
  }, [player]);

  const backButton = (
    <Button variant="ghost" className="mb-6 -ml-4 gap-2" asChild>
      <Link href="/players">
        <ArrowLeft className="h-4 w-4" /> Back to players
      </Link>
    </Button>
  );

  if (isLoading) {
    return (
      <div className="content mx-auto max-w-2xl">
        {backButton}
        <div className="mb-8 h-9 w-64 animate-pulse rounded bg-muted/50" />
        <div className="mb-8 h-5 w-40 animate-pulse rounded bg-muted/50" />

        <Card className="surface-card">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-y-6 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="mb-2 h-3 w-20 animate-pulse rounded bg-muted/50" />
                  <div className="h-5 w-28 animate-pulse rounded bg-muted/50" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="content mx-auto max-w-2xl">
        {backButton}
        <p className="text-destructive">
          Failed to load player. The player may not exist.
        </p>
      </div>
    );
  }

  return (
    <div className="content mx-auto max-w-2xl">
      {backButton}

      <div
        className={`transition-opacity duration-300 ${contentVisible ? "opacity-100" : "opacity-0"}`}
      >
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-medium text-foreground">
            {player.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div>
            <h1 className="text-page-title mb-1">{player.name}</h1>
            <p className="text-page-description">
              {player.position || "Position unknown"} ·{" "}
              {player.nationality || "Nationality unknown"}
            </p>
          </div>
        </div>

        <Card className="surface-card">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-y-6 md:grid-cols-2">
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
                <div className="font-mono-data text-lg text-foreground">
                  {player.id}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-caption mt-6">
          More detailed statistics and match history coming soon.
        </p>
      </div>
    </div>
  );
}