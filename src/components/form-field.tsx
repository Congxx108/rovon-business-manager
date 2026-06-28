import { inputClassName, labelClassName, textareaClassName } from "@/components/ui";

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
  rows?: number;
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
  rows,
}: FormFieldProps) {
  return (
    <label className={labelClassName}>
      <span>
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </span>
      {textarea ? (
        <textarea name={name} required={required} placeholder={placeholder} defaultValue={defaultValue} rows={rows ?? 4} className={textareaClassName} />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          min={min}
          step={step}
          className={inputClassName}
        />
      )}
    </label>
  );
}
