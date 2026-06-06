"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { apiFetchJson, ApiError } from "@/lib/api";
import {
  buildMatchAnalysisConfig,
  type MatchAnalysisConfig,
} from "@/lib/analysis-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface SavedAnalysis {
  id: string;
  title: string;
}

interface SaveAnalysisDialogProps {
  matchId: number;
  matchLabel: string;
  selectedEventType: string;
  visibleEventTypes: string[];
  use3DView: boolean;
  current3DView: "top" | "side" | "goal" | "iso";
}

export function SaveAnalysisDialog({
  matchId,
  matchLabel,
  selectedEventType,
  visibleEventTypes,
  use3DView,
  current3DView,
}: SaveAnalysisDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const saveMutation = useMutation({
    mutationFn: () => {
      const config: MatchAnalysisConfig = buildMatchAnalysisConfig({
        selectedEventType,
        visibleEventTypes,
        use3DView,
        current3DView,
      });
      return apiFetchJson<SavedAnalysis>("/analyses/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          notes: notes.trim() || null,
          match_id: matchId,
          config,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-analyses"] });
      setOpen(false);
      setTitle("");
      setNotes("");
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Bookmark className="mr-2 h-4 w-4" />
          Save view
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Save analysis view</SheetTitle>
          <SheetDescription>
            Private to you in the active workspace. Restores filters and pitch
            layers for {matchLabel}.
          </SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) saveMutation.mutate();
          }}
        >
          <div>
            <label htmlFor="analysis-title" className="text-label mb-1.5 block">
              Title
            </label>
            <Input
              id="analysis-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. First-half pressures"
              required
            />
          </div>
          <div>
            <label htmlFor="analysis-notes" className="text-label mb-1.5 block">
              Notes (optional)
            </label>
            <Input
              id="analysis-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Short coaching note"
            />
          </div>
          {saveMutation.error && (
            <p className="text-caption text-destructive">
              {saveMutation.error instanceof ApiError
                ? saveMutation.error.message
                : "Could not save analysis."}
            </p>
          )}
          {saveMutation.isSuccess && (
            <p className="text-caption text-primary">Saved to your library.</p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={saveMutation.isPending || !title.trim()}
          >
            {saveMutation.isPending ? "Saving…" : "Save analysis"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}