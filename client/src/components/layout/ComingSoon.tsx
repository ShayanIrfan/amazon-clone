import type { ReactNode } from "react";

// A nav item for a feature not built yet (later milestones: sign-in, cart,
// orders, deals, ...). Renders like a normal link but never 404s.
export default function ComingSoon({
  children,
  className,
  milestone,
}: {
  children: ReactNode;
  className?: string;
  milestone?: string;
}) {
  return (
    <button
      type="button"
      title={milestone ? `Coming in ${milestone}` : "Coming soon"}
      onClick={() => alert(milestone ? `Coming in ${milestone}.` : "Coming soon.")}
      className={className}
    >
      {children}
    </button>
  );
}
