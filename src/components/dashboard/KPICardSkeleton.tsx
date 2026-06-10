export function KPICardSkeleton() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-md border border-[var(--border-subtle)] px-4 py-3.5 border-l-[3px] border-l-[var(--border-default)] animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-md bg-[var(--bg-inset)] mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 bg-[var(--bg-inset)] rounded" />
          <div className="h-7 w-16 bg-[var(--bg-inset)] rounded" />
          <div className="h-3 w-32 bg-[var(--bg-inset)] rounded" />
        </div>
      </div>
    </div>
  );
}
