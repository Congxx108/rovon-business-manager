import Link from "next/link";

type PageHeaderProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, actionHref, actionLabel, secondaryActionHref, secondaryActionLabel, actions }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 flex-1 basis-[24rem]">
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-950">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions || (secondaryActionHref && secondaryActionLabel) || (actionHref && actionLabel) ? <div className="flex max-w-full flex-wrap gap-2">
        {actions}
        {secondaryActionHref && secondaryActionLabel ? (
          <Link
            href={secondaryActionHref}
            className="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/50 transition hover:border-slate-400 hover:bg-slate-50 active:translate-y-px"
          >
            {secondaryActionLabel}
          </Link>
        ) : null}
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#0f274a] px-4 text-sm font-semibold text-white shadow-sm shadow-blue-900/20 transition hover:bg-[#16365f] active:translate-y-px"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div> : null}
    </div>
  );
}
