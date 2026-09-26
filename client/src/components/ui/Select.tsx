import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  containerClassName?: string;
  /** Shows a red asterisk on the label and sets aria-required. */
  required?: boolean;
}

const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, id, className = "", containerClassName = "", required, children, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-ink">
          {label}
          {required && <span className="text-clay"> *</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-required={required || undefined}
          className={`h-11 w-full appearance-none rounded-xl border border-line-strong bg-white pr-9 pl-4 text-sm text-ink outline-none transition-colors focus:border-harbor focus:ring-4 focus:ring-harbor/10 ${className}`}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate" aria-hidden />
      </div>
    </div>
  );
});

export default Select;
