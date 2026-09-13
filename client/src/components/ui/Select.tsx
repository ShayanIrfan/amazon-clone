import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  containerClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, id, className = "", containerClassName = "", children, ...rest },
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
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          className={`h-10 w-full appearance-none rounded-md border border-line-strong bg-white pr-9 pl-3 text-sm text-ink outline-none focus:border-harbor ${className}`}
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
