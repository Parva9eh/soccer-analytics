"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { apiFetchJson, ApiError } from "@/lib/api";
import type { WorkspaceReport } from "@/lib/report-types";
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

interface SaveReportDialogProps {
  competition?: string;
  season?: string;
  scopeLabel: string;
}

export function SaveReportDialog({
  competition,
  season,
  scopeLabel,
}: SaveReportDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetchJson<WorkspaceReport>("/reports/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          notes: notes.trim() || null,
          competition: competition || null,
          season: season || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-reports"] });
      setOpen(false);
      setTitle("");
      setNotes("");
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="mr-2 h-4 w-4" />
          Save report
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Save workspace report</SheetTitle>
          <SheetDescription>
            Stores a CSV-exportable snapshot for {scopeLabel} in the active
            workspace. Private to you.
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
            <label htmlFor="report-title" className="text-label mb-1.5 block">
              Title
            </label>
            <Input
              id="report-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. La Liga 2020/21 season overview"
              required
            />
          </div>
          <div>
            <label htmlFor="report-notes" className="text-label mb-1.5 block">
              Notes (optional)
            </label>
            <Input
              id="report-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Coaching or analyst note"
            />
          </div>
          {saveMutation.error && (
            <p className="text-caption text-destructive">
              {saveMutation.error instanceof ApiError
                ? saveMutation.error.message
                : "Could not save report."}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={saveMutation.isPending || !title.trim()}
          >
            {saveMutation.isPending ? "Saving…" : "Save report"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}