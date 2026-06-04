"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Calendar, Target, Users, BarChart3 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
      const res = await apiFetch("/summary/");
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
  });

  if (error) {
    return (
      <div className="content">
        <PageHeader title="Dashboard" />
        <Card className="surface-card">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Failed to load dashboard data. Please check the backend.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="content">
      <PageHeader
        eyebrow="La Liga 2020/21"
        title="Dashboard"
        description="Season overview — matches, events, and squad data at a glance."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
        <StatCard
          label="Total matches"
          value={data?.total_matches ?? 0}
          hint="Full season fixture list"
          icon={Calendar}
          loading={isLoading}
        />
        <StatCard
          label="Total events"
          value={data?.total_events?.toLocaleString() ?? 0}
          hint="Passes, shots, pressures, and more"
          icon={Target}
          loading={isLoading}
        />
        <StatCard
          label="Players tracked"
          value={data?.total_players ?? 0}
          hint="From match lineups"
          icon={Users}
          loading={isLoading}
        />
      </div>

      <Card className="surface-card mt-8">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/matches">Browse matches</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              View analytics
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}