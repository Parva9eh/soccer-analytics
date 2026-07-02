import { PageShell } from "@/components/ui/page-shell";

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted/50 ${className}`} />;
}

export function WorkspaceManageSkeleton() {
  return (
    <PageShell>
      <Block className="mb-4 h-8 w-36" />
      <Block className="mb-2 h-8 w-56 max-w-full" />
      <div className="mb-8 flex gap-2">
        <Block className="h-6 w-24" />
        <Block className="h-6 w-16" />
        <Block className="h-5 w-20" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="surface-card rounded-xl border p-6">
            <Block className="mb-4 h-5 w-32" />
            <div className="space-y-2">
              <Block className="h-10 w-full" />
              <Block className="h-10 w-full" />
              <Block className="h-10 w-3/4 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}