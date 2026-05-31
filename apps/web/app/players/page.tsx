"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
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
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Players
          </h1>
          <p className="text-slate-400 mt-1">Loading players...</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-left text-sm text-slate-400">
                <th className="py-3 pr-4 font-medium">Player</th>
                <th className="py-3 px-4 font-medium">Position</th>
                <th className="py-3 px-4 font-medium hidden sm:table-cell">Jersey</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Nationality</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-800">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-slate-700 animate-pulse" />
                      <div className="h-4 w-40 bg-slate-700 rounded animate-pulse" />
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-24 bg-slate-700 rounded animate-pulse" />
                  </td>
                  <td className="py-4 px-4 hidden sm:table-cell">
                    <div className="h-4 w-16 bg-slate-700 rounded animate-pulse" />
                  </td>
                  <td className="py-4 px-4 hidden md:table-cell">
                    <div className="h-4 w-28 bg-slate-700 rounded animate-pulse" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-400">
        Failed to load players. Please check the backend.
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Players
        </h1>
        <p className="text-slate-400 mt-1">
          {sortedPlayers.length} players found
        </p>
      </div>

      {/* Search input with debouncing + clear button (B) */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            placeholder="Search players by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-600"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        {search !== debouncedSearch && (
          <span className="text-xs text-slate-400">Searching...</span>
        )}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={toggleSort}
              >
                Player {sortDirection === "asc" ? "↑" : "↓"}
              </TableHead>
              <TableHead>Position</TableHead>
              <TableHead className="hidden sm:table-cell">Jersey</TableHead>
              <TableHead className="hidden md:table-cell">Nationality</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPlayers.length > 0 ? (
              sortedPlayers.map((player) => (
                <TableRow
                  key={player.id}
                  className="cursor-pointer hover:bg-slate-950 min-h-[52px]"
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
                  <TableCell className="font-medium text-white">
                    <div className="flex items-center gap-3">
                      {/* B: Simple initials avatar */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-white">
                        {player.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <Link
                        href={`/players/${player.id}`}
                        className="hover:underline hover:text-blue-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {player.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>{player.position || "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{player.jersey_number ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{player.nationality || "—"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-slate-400">
                  {search ? "No players found for your search." : "No players loaded yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-slate-500 mt-4">
        Click "Player" to sort. Search is debounced for better performance.
      </p>
    </div>
  );
}
