type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "success" | "info";
};

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  const toneClassName = {
    default: "from-white to-slate-50/80",
    warning: "from-white to-amber-50/90",
    success: "from-white to-emerald-50/90",
    info: "from-white to-blue-50/90",
  }[tone];

  return (
    <div className={`polish-fade-in rounded-2xl border border-slate-200/80 bg-gradient-to-br ${toneClassName} p-5 shadow-sm shadow-slate-200/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
      {hint ? <div className="mt-2 text-xs leading-5 text-slate-500">{hint}</div> : null}
    </div>
  );
}
