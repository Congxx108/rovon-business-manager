type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  min?: string | number;
  step?: string | number;
  textarea?: boolean;
};

export function FormField({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
  min,
  step,
  textarea,
}: FormFieldProps) {
  const className =
    "mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm shadow-slate-200/40 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10";

  return (
    <label className="block text-sm font-medium text-slate-700">
      <span>
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </span>
      {textarea ? (
        <textarea name={name} required={required} placeholder={placeholder} defaultValue={defaultValue} rows={4} className={className} />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          min={min}
          step={step}
          className={className}
        />
      )}
    </label>
  );
}
