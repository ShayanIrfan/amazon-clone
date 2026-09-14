import type { ReactNode } from "react";

export default function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`surface rounded-md ${className}`}>{children}</div>;
}
