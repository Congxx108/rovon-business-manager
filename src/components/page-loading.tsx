export function PageLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-5 text-slate-600 lg:pl-72">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
