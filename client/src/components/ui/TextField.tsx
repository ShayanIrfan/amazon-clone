import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, hint, error, id, className = "", containerClassName = "", ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={`h-11 w-full rounded-xl border bg-white px-4 text-sm text-ink outline-none transition-colors placeholder:text-slate/60 focus:ring-4 ${
          error ? "border-clay focus:border-clay focus:ring-clay/10" : "border-line-strong focus:border-harbor focus:ring-harbor/10"
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="mt-1.5 text-sm text-clay">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-sm text-slate">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default TextField;
