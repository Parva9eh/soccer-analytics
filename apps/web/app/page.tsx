"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Target, Users } from "lucide-react";

interface SummaryData {
  total_matches: number;
  total_events: number;
  total_players: number;
  status: string;
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery<SummaryData>({
    queryKey: ["summary"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/summary/");
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-semibold mb-8 text-white">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="border-slate-700 bg-slate-800 animate-pulse"
            >
              <CardHeader>
                <div className="h-4 bg-slate-700 rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-slate-700 rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-slate-700 bg-slate-800">
          <CardContent className="pt-6">
            <p className="text-red-400">
              Failed to load dashboard data. Please check the backend.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Dashboard
        </h1>
        <p className="text-slate-400 mt-1">
          Overview of La Liga 2020/2021 season
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Matches Card */}
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total Matches
            </CardTitle>
            <Calendar className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {data?.total_matches ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">La Liga 2020/21</p>
          </CardContent>
        </Card>

        {/* Total Events Card */}
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total Events
            </CardTitle>
            <Target className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {data?.total_events?.toLocaleString() ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Passes, shots, pressures...
            </p>
          </CardContent>
        </Card>

        {/* Total Players Card */}
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Players Loaded
            </CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {data?.total_players ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">From lineups</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <a
              href="/matches"
              className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
            >
              Browse Matches
            </a>
            <a
              href="/analytics"
              className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
            >
              View Analytics
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
