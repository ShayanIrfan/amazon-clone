import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <Icon size={40} className="text-line-strong" aria-hidden />
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="max-w-sm text-sm text-slate">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
