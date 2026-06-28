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
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {secondaryActionHref && secondaryActionLabel ? (
          <Link
            href={secondaryActionHref}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {secondaryActionLabel}
          </Link>
        ) : null}
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
