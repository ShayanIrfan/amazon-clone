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
        <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={`h-10 w-full rounded-md border bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-slate/70 ${
          error ? "border-clay" : "border-line-strong focus:border-harbor"
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1 text-sm text-clay">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="mt-1 text-sm text-slate">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default TextField;
