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
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mint" aria-hidden>
        <Icon size={28} className="text-harbor" />
      </span>
      <h2 className="text-lg font-extrabold tracking-[-0.01em] text-ink">{title}</h2>
      {description && <p className="max-w-sm text-sm text-slate">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
