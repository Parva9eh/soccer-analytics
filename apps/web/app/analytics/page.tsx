"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, GitBranch, Users, BarChart3, TrendingUp, Calendar, Activity } from "lucide-react";

interface SummaryData {
  total_matches: number;
  total_events: number;
  total_players: number;
  status: string;
}

export default function AnalyticsPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery<SummaryData>({
    queryKey: ["summary"],
    queryFn: async () => {
      const res = await apiFetch("/summary/");
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Analytics
        </h1>
        <p className="text-slate-400 mt-1">
          Advanced metrics and tactical insights
        </p>
      </div>

      {/* Professional KPI Row - Inspired by Driblab / Iterpro style */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-700 bg-slate-900 hover:border-slate-600 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-label mb-1">Matches Analyzed</div>
                <div className="metric-value text-3xl font-semibold text-white">
                  {summaryLoading ? (
                    <div className="h-8 w-14 bg-slate-700 rounded animate-pulse" />
                  ) : (
                    summary?.total_matches ?? "—"
                  )}
                </div>
              </div>
              <Calendar className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900 hover:border-slate-600 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-label mb-1">Total Events</div>
                <div className="metric-value text-3xl font-semibold text-white">
                  {summaryLoading ? (
                    <div className="h-8 w-20 bg-slate-700 rounded animate-pulse" />
                  ) : (
                    summary?.total_events?.toLocaleString() ?? "—"
                  )}
                </div>
              </div>
              <Activity className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900 hover:border-slate-600 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-label mb-1">Players Tracked</div>
                <div className="metric-value text-3xl font-semibold text-white">
                  {summaryLoading ? (
                    <div className="h-8 w-14 bg-slate-700 rounded animate-pulse" />
                  ) : (
                    summary?.total_players ?? "—"
                  )}
                </div>
              </div>
              <Users className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900 hover:border-slate-600 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-label mb-1">Competition</div>
                <div className="metric-value text-3xl font-semibold text-white">La Liga</div>
                <div className="text-sm text-slate-400">2020/21 Season</div>
              </div>
              <BarChart3 className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Expected Goals */}
        <Card className="border-slate-700 bg-slate-900 transition-all hover:border-slate-600 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Expected Goals (xG)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Coming soon — shot quality and xG models for players and teams.
            </p>
          </CardContent>
        </Card>

        {/* Passing Networks */}
        <Card className="border-slate-700 bg-slate-900 transition-all hover:border-slate-600 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Passing Networks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Coming soon — interactive passing networks and progressive passes.
            </p>
          </CardContent>
        </Card>

        {/* Possession & Build-up */}
        <Card className="border-slate-700 bg-slate-900 transition-all hover:border-slate-600 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Possession &amp; Build-up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Coming soon — possession chains, build-up patterns, and territory analysis.
            </p>
          </CardContent>
        </Card>

        {/* Player Insights */}
        <Card className="border-slate-700 bg-slate-900 transition-all hover:border-slate-600 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Player Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Coming soon — advanced player profiles, radar charts, and comparisons.
            </p>
          </CardContent>
        </Card>

        {/* Trends & Form */}
        <Card className="border-slate-700 bg-slate-900 transition-all hover:border-slate-600 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trends &amp; Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Coming soon — rolling form, momentum metrics, and trend analysis.
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-slate-400 mt-8">
        This page is under active development. Real interactive visualizations are coming in the next increments.
      </p>
    </div>
  );
}
