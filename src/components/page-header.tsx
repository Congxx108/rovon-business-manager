import Link from "next/link";

type PageHeaderProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
};

export function PageHeader({ title, description, actionHref, actionLabel, secondaryActionHref, secondaryActionLabel }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-950">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {secondaryActionHref && secondaryActionLabel ? (
          <Link
            href={secondaryActionHref}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/50 transition hover:border-slate-400 hover:bg-slate-50 active:translate-y-px"
          >
            {secondaryActionLabel}
          </Link>
        ) : null}
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0f274a] px-4 text-sm font-semibold text-white shadow-sm shadow-blue-900/20 transition hover:bg-[#16365f] active:translate-y-px"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
