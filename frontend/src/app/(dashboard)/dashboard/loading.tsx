export default function DashboardLoading() {
  return (
    <div className="space-y-6 py-4">
      <div className="h-10 w-56 animate-pulse rounded bg-espresso-200/10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-espresso-200/10"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-espresso-200/10" />
    </div>
  );
}
