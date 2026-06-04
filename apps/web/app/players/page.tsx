"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
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

  // Debounce the search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: players,
    isLoading,
    error,
    isFetching,
  } = useQuery<Player[]>({
    queryKey: ["players", debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (debouncedSearch) params.append("search", debouncedSearch);

      const res = await apiFetch(`/players/?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch players");
      return res.json();
    },
    placeholderData: (previousData) => previousData, // Keep previous results while searching
  });

  // Client-side sorting on Name (B)
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

  if (isLoading) {
    return (
      <div className="content">
        <PageHeader title="Players" description="Loading players…" />

        <div className="surface-card overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="TableHead sortable cursor-pointer select-none">
                  Player
                </TableHead>
                <TableHead className="TableHead">Position</TableHead>
                <TableHead className="TableHead hidden sm:table-cell numeric">Jersey</TableHead>
                <TableHead className="TableHead hidden md:table-cell">Nationality</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} className="TableRow">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted/50" />
                      <div className="h-4 w-40 animate-pulse rounded bg-muted/50" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell numeric">
                    <div className="h-4 w-16 animate-pulse rounded bg-muted/50" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="h-4 w-28 animate-pulse rounded bg-muted/50" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content">
        <PageHeader title="Players" />
        <p className="text-destructive">Failed to load players. Please check the backend.</p>
      </div>
    );
  }

  return (
    <div className="content">
      <PageHeader
        title="Players"
        description={`${sortedPlayers.length} players in the database`}
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-full max-w-sm">
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
        {search !== debouncedSearch && (
          <span className="text-caption">Searching…</span>
        )}
      </div>

      <div className="surface-card overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="TableHead sortable cursor-pointer select-none"
                onClick={toggleSort}
              >
                Player {sortDirection === "asc" ? "↑" : "↓"}
              </TableHead>
              <TableHead className="TableHead">Position</TableHead>
              <TableHead className="TableHead hidden sm:table-cell numeric">Jersey</TableHead>
              <TableHead className="TableHead hidden md:table-cell">Nationality</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="stagger in">
            {sortedPlayers.length > 0 ? (
              sortedPlayers.map((player) => (
                <TableRow
                  key={player.id}
                  tabIndex={0}
                  role="button"
                  className="TableRow cursor-pointer min-h-[52px] focus:outline-none"
                  onClick={() => router.push(`/players/${player.id}`)}
                  onMouseEnter={() => {
                    queryClient.prefetchQuery({
                      queryKey: ["player", player.id],
                      queryFn: async () => {
                        const res = await apiFetch(`/players/${player.id}`);
                        if (!res.ok) throw new Error("Failed to fetch player");
                        return res.json();
                      },
                    });
                  }}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground">
                        {player.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <Link
                        href={`/players/${player.id}`}
                        className="link transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {player.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>{player.position || "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell numeric">{player.jersey_number ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{player.nationality || "—"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center">
                  <div className="text-sm font-medium text-foreground">
                    {search ? "No players match your search" : "No players available"}
                  </div>
                  <div className="mt-1 text-caption">
                    {search ? "Try a different name or clear the search." : "Data will appear once loaded."}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-caption mt-4">
        Click "Player" to sort. Search is debounced for better performance.
      </p>
    </div>
  );
}
