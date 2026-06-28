export function PageLoading() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc,#eef3f9)] p-5 text-slate-600 lg:pl-72">
      <div className="mx-auto max-w-[1480px] space-y-5">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-4 w-80 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
