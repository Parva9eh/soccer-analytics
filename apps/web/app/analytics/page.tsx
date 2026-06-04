"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Target,
  GitBranch,
  Users,
  BarChart3,
  TrendingUp,
  Calendar,
  Activity,
} from "lucide-react";

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

  const roadmap = [
    {
      title: "Expected Goals (xG)",
      icon: Target,
      body: "Shot quality and xG models for players and teams.",
    },
    {
      title: "Passing networks",
      icon: GitBranch,
      body: "Interactive passing networks and progressive passes.",
    },
    {
      title: "Possession & build-up",
      icon: BarChart3,
      body: "Possession chains, build-up patterns, and territory.",
    },
    {
      title: "Player insights",
      icon: Users,
      body: "Advanced profiles, radar charts, and comparisons.",
    },
    {
      title: "Trends & form",
      icon: TrendingUp,
      body: "Rolling form, momentum metrics, and trend analysis.",
    },
  ];

  return (
    <div className="content">
      <PageHeader
        eyebrow="Tactical analysis"
        title="Analytics"
        description="Advanced metrics and visualizations for La Liga 2020/21."
      />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          label="Matches analyzed"
          value={summary?.total_matches ?? "—"}
          icon={Calendar}
          loading={summaryLoading}
        />
        <StatCard
          label="Total events"
          value={summary?.total_events?.toLocaleString() ?? "—"}
          icon={Activity}
          loading={summaryLoading}
        />
        <StatCard
          label="Players tracked"
          value={summary?.total_players ?? "—"}
          icon={Users}
          loading={summaryLoading}
        />
        <StatCard
          label="Competition"
          value="La Liga"
          hint="2020/21 season"
          icon={BarChart3}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roadmap.map(({ title, icon: Icon, body }) => (
          <Card key={title} className="surface-card card-compact">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-5 w-5 text-primary" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body-sm text-muted-foreground">
                Coming soon — {body}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-caption mt-8">
        Interactive charts and filters are planned for the next development increment.
      </p>
    </div>
  );
}