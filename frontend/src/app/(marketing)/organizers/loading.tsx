export default function OrganizersLoading() {
  return (
    <div className="section">
      <div className="container-x py-16">
        <div className="h-8 w-48 animate-pulse rounded bg-espresso-200/10" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl bg-espresso-200/10"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
