import type { ReactNode } from "react";
import Breadcrumbs, { type Crumb } from "./Breadcrumbs";

interface Props {
  title: string;
  eyebrow?: string;
  description?: string;
  breadcrumbs?: Crumb[];
  /** Actions shown on the right on wide screens, below the title on mobile. */
  actions?: ReactNode;
}

/** The standard top of a page: optional breadcrumbs, an eyebrow, the H1, a description, and actions. */
export default function PageHeader({ title, eyebrow, description, breadcrumbs, actions }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h1 className="page-title text-ink">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm text-slate">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
