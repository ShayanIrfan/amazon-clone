import type { ReactNode } from "react";
import { Link } from "react-router";

interface Props {
  title: string;
  seeAllHref?: string;
  right?: ReactNode;
}

export default function SectionHeader({ title, seeAllHref, right }: Props) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="flex items-center gap-3">
        {seeAllHref && (
          <Link to={seeAllHref} className="text-sm font-medium text-harbor hover:underline">
            See all
          </Link>
        )}
        {right}
      </div>
    </div>
  );
}
