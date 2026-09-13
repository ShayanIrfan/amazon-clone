import type { ReactNode } from "react";

/** The one page width used everywhere — replaces the pre-redesign mix of
 * max-w-4xl/5xl/6xl scattered across pages. */
export default function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1280px] px-4 sm:px-6 ${className}`}>{children}</div>;
}
