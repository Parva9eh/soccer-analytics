import Link from "next/link";
import { Database } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  NO_LINKED_DATASETS_TITLE,
  noLinkedDatasetsDescription,
  workspaceManageHref,
} from "@/lib/workspace-empty";

interface WorkspaceDatasetsEmptyProps {
  workspaceId?: string;
  compact?: boolean;
  className?: string;
}

export function WorkspaceDatasetsEmpty({
  workspaceId,
  compact = false,
  className,
}: WorkspaceDatasetsEmptyProps) {
  const href = workspaceManageHref(workspaceId);

  return (
    <EmptyState
      icon={Database}
      compact={compact}
      className={className}
      title={NO_LINKED_DATASETS_TITLE}
      description={noLinkedDatasetsDescription()}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href={href}>Link datasets</Link>
        </Button>
      }
    />
  );
}