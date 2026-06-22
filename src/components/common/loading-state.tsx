export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="glass-panel rounded-2xl border p-5" aria-live="polite">
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-blue-100" />
      <div className="space-y-3">
        <div className="h-3 w-full animate-pulse rounded bg-blue-50" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-blue-50" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-blue-50" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
