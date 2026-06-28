import Link from "next/link";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  type?: "button" | "submit";
  name?: string;
  value?: string;
  variant?: "primary" | "secondary" | "danger" | "warning" | "ghost";
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
    neutral: "border-slate-200 bg-slate-100/80 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none ${tones[tone]}`}>
      {children}
    </span>
  );
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
    <section className={sectionCardClassName}>
      <div className="mb-4 border-b border-slate-100 pb-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-12 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`${sectionCardClassName} ${className}`}>{children}</section>;
}

export function FilterBar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mb-5 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-200/60 ${className}`}>{children}</div>;
}

export const inputClassName =
  "mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm shadow-slate-200/40 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";

export const textareaClassName =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm shadow-slate-200/40 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";

export const labelClassName = "block text-sm font-medium text-slate-700";
export const sectionCardClassName =
  "polish-fade-in rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/70 transition duration-200 hover:shadow-md hover:shadow-slate-200/70";
export const tableShellClassName =
  "overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm shadow-slate-200/70";
export const tableHeadClassName =
  "border-b border-slate-200 bg-slate-50/95 text-xs font-semibold uppercase tracking-wide text-slate-500 [&_th]:whitespace-nowrap";
export const tableRowClassName = "border-b border-slate-100 align-middle transition-colors duration-150 hover:bg-blue-50/40";

function buttonClassName(variant: NonNullable<ButtonProps["variant"]>) {
  const base =
    "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white";
  const variants = {
    primary: "bg-[#0f274a] text-white shadow-sm shadow-blue-900/20 hover:bg-[#16365f]",
    secondary: "border border-slate-300 bg-white text-slate-700 shadow-sm shadow-slate-200/50 hover:border-slate-400 hover:bg-slate-50",
    danger: "bg-rose-700 text-white shadow-sm shadow-rose-900/20 hover:bg-rose-600",
    warning: "bg-amber-600 text-white shadow-sm shadow-amber-900/20 hover:bg-amber-500",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  };

  return `${base} ${variants[variant]}`;
}
