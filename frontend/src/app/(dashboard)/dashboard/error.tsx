"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-200/40 bg-rose-50/50 p-8 text-center">
      <h2 className="font-serif text-xl text-espresso-200">Dashboard error</h2>
      <p className="mt-2 text-sm text-muted">
        Something failed while loading this section.
      </p>
      <button type="button" className="btn-primary mt-6" onClick={() => reset()}>
        Retry
      </button>
    </div>
  );
}
