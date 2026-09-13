import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  children: ReactNode;
}

const Checkbox = forwardRef<HTMLInputElement, Props>(function Checkbox({ children, className = "", ...rest }, ref) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 text-sm text-ink ${className}`}>
      <input ref={ref} type="checkbox" className="h-4 w-4 accent-harbor" {...rest} />
      {children}
    </label>
  );
});

export default Checkbox;
