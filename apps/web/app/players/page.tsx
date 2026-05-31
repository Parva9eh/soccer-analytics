"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface Player {
  id: number;
  name: string;
  position: string | null;
  jersey_number: number | null;
  nationality: string | null;
}

export default function PlayersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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
                <th className="py-3 px-4 font-medium">Jersey</th>
                <th className="py-3 px-4 font-medium">Nationality</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-800">
                  <td className="py-4 pr-4">
                    <div className="h-4 w-40 bg-slate-700 rounded animate-pulse" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-24 bg-slate-700 rounded animate-pulse" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-16 bg-slate-700 rounded animate-pulse" />
                  </td>
                  <td className="py-4 px-4">
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
          {players?.length ?? 0} players found
        </p>
      </div>

      {/* Search input with debouncing */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search players by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-600"
        />
        {search !== debouncedSearch && (
          <span className="text-xs text-slate-400">Searching...</span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-950 text-left text-slate-400">
              <th className="py-3 px-6 font-medium">Player</th>
              <th className="py-3 px-6 font-medium">Position</th>
              <th className="py-3 px-6 font-medium">Jersey</th>
              <th className="py-3 px-6 font-medium">Nationality</th>
            </tr>
          </thead>
          <tbody>
            {players && players.length > 0 ? (
              players.map((player) => (
                <tr
                  key={player.id}
                  className="border-b border-slate-800 hover:bg-slate-950 transition-colors"
                >
                  <td className="py-4 px-6 font-medium text-white">
                    {player.name}
                  </td>
                  <td className="py-4 px-6 text-slate-300">
                    {player.position || "—"}
                  </td>
                  <td className="py-4 px-6 text-slate-300">
                    {player.jersey_number ?? "—"}
                  </td>
                  <td className="py-4 px-6 text-slate-300">
                    {player.nationality || "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  {search ? "No players found for your search." : "No players loaded yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500 mt-4">
        Data loaded from the backend. Use the search box to filter by name.
      </p>
    </div>
  );
}
