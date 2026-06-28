import Link from "next/link";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  type?: "button" | "submit";
  name?: string;
  value?: string;
  variant?: "primary" | "secondary" | "danger" | "warning";
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
};

export function Button({ children, href, type = "button", name, value, variant = "primary", disabled, className = "", onClick }: ButtonProps) {
  const classes = `${buttonClassName(variant)} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} name={name} value={value} disabled={disabled} className={classes} onClick={onClick}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50">
      <div className="mb-3 border-b border-slate-100 pb-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export const tableShellClassName = "overflow-x-auto rounded-lg border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50";
export const tableHeadClassName =
  "border-b border-slate-200 bg-slate-50/90 text-xs uppercase tracking-wide text-slate-500 [&_th]:whitespace-nowrap";
export const tableRowClassName = "border-b border-slate-100 align-middle hover:bg-slate-50/80";

function buttonClassName(variant: NonNullable<ButtonProps["variant"]>) {
  const base =
    "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white";
  const variants = {
    primary: "bg-slate-950 text-white shadow-sm shadow-slate-300/70 hover:bg-slate-800",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-rose-700 text-white hover:bg-rose-600",
    warning: "bg-amber-700 text-white hover:bg-amber-600",
  };

  return `${base} ${variants[variant]}`;
}
