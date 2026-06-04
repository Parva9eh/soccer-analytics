import { Suspense } from "react";
import {
  MatchesListPage,
  MatchesListPageSkeleton,
} from "@/components/matches/MatchesListPage";

export default function MatchesPage() {
  return (
    <Suspense fallback={<MatchesListPageSkeleton />}>
      <MatchesListPage />
    </Suspense>
  );
}