"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { apiFetchJson } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { TableContainer } from "@/components/ui/table-container";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Player {
  id: number;
  name: string;
  position: string | null;
  jersey_number: number | null;
  nationality: string | null;
}

export default function PlayersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: players,
    isLoading,
    error,
    isFetching,
    refetch,
  } = useQuery<Player[]>({
    queryKey: ["players", debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (debouncedSearch) params.append("search", debouncedSearch);
      return apiFetchJson<Player[]>(`/players/?${params.toString()}`);
    },
    placeholderData: (previousData) => previousData,
  });

  const sortedPlayers = useMemo(() => {
    if (!players) return [];
    return [...players].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [players, sortDirection]);

  const toggleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Players" />
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load players."
          onRetry={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Players"
        description={`${sortedPlayers.length} players in the database`}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        {(search !== debouncedSearch || isFetching) && (
          <span className="text-caption">Searching…</span>
        )}
      </div>

      {isLoading ? (
        <div className="surface-card overflow-hidden rounded-xl border">
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="hidden sm:table-cell">Jersey</TableHead>
                  <TableHead className="hidden md:table-cell">Nationality</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 animate-pulse rounded-full bg-muted/50" />
                        <div className="h-4 w-40 animate-pulse rounded bg-muted/50" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="h-4 w-16 animate-pulse rounded bg-muted/50" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="h-4 w-28 animate-pulse rounded bg-muted/50" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      ) : sortedPlayers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "No players match your search" : "No players available"}
          description={
            search
              ? "Try a different name or clear the search."
              : "Player data will appear once loaded into the database."
          }
          action={
            search ? (
              <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="surface-card overflow-hidden rounded-xl border">
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="sortable cursor-pointer select-none"
                    onClick={toggleSort}
                  >
                    Player {sortDirection === "asc" ? "↑" : "↓"}
                  </TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="hidden sm:table-cell numeric">
                    Jersey
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Nationality
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger in">
                {sortedPlayers.map((player) => (
                  <TableRow
                    key={player.id}
                    tabIndex={0}
                    role="button"
                    className="TableRow min-h-[52px] cursor-pointer"
                    onClick={() => router.push(`/players/${player.id}`)}
                    onMouseEnter={() => {
                      queryClient.prefetchQuery({
                        queryKey: ["player", player.id],
                        queryFn: () =>
                          apiFetchJson<Player>(`/players/${player.id}`),
                      });
                    }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                          {player.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <Link
                          href={`/players/${player.id}`}
                          className="link truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {player.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>{player.position || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell numeric">
                      {player.jersey_number ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {player.nationality || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}

      <p className="text-caption mt-4">
        Tap a row to open a player. Search is debounced for performance.
      </p>
    </PageShell>
  );
}