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

  // Subtle fade-in when real content arrives
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (player) {
      // Small timeout ensures the DOM is ready before starting the fade
      const timer = setTimeout(() => setContentVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setContentVisible(false);
    }
  }, [player]);

  if (isLoading) {
    return (
      <div className="content max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/players">
            <Button variant="ghost" className="mb-6 -ml-4 flex items-center gap-2 text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Back to Players
            </Button>
          </Link>
          <div className="h-9 w-64 bg-slate-700 rounded animate-pulse mb-2" />
          <div className="h-5 w-40 bg-slate-700 rounded animate-pulse" />
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-20 bg-slate-700 rounded mb-2 animate-pulse" />
                  <div className="h-5 w-28 bg-slate-700 rounded animate-pulse" />
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
      <div className="content max-w-2xl mx-auto">
        <Link href="/players">
          <Button variant="ghost" className="mb-6 -ml-4 flex items-center gap-2 text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Players
          </Button>
        </Link>
        <div className="text-red-400">
          Failed to load player. The player may not exist.
        </div>
      </div>
    );
  }

  return (
    <div className="content max-w-2xl mx-auto">
      <Link href="/players">
        <Button variant="ghost" className="mb-6 -ml-4 flex items-center gap-2 text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Players
        </Button>
      </Link>

      <div 
        className={`transition-opacity duration-300 ${contentVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="mb-8 flex items-center gap-4">
          {/* B: Initials avatar in detail header */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xl font-medium text-white">
            {player.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white mb-1">
              {player.name}
            </h1>
            <p className="text-slate-400">
              {player.position || "Position unknown"} · {player.nationality || "Nationality unknown"}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6">
              <div>
                <div className="text-label mb-1">Position</div>
                <div className="text-lg text-white">{player.position || "—"}</div>
              </div>

              <div>
                <div className="text-label mb-1">Jersey Number</div>
                <div className="text-lg text-white">{player.jersey_number ?? "—"}</div>
              </div>

              <div>
                <div className="text-label mb-1">Nationality</div>
                <div className="text-lg text-white">{player.nationality || "—"}</div>
              </div>

              <div>
                <div className="text-label mb-1">Player ID</div>
                <div className="text-lg text-white font-mono">{player.id}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-body-sm text-slate-400 mt-6">
          More detailed statistics and match history coming soon.
        </p>
      </div>
    </div>
  );
}
