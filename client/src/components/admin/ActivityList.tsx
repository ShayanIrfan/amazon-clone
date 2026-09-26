import { History } from "lucide-react";
import type { AuditEntry } from "../../lib/types";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import Skeleton from "../ui/Skeleton";

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

interface Props {
  entries: AuditEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/** Audit entries as a compact timeline. Shared by the dashboard and (later) order and product pages. */
export default function ActivityList({ entries, isLoading, isError, onRetry }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4" aria-label="Loading activity">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState message="Couldn't load activity." onRetry={onRetry} />;
  if (!entries?.length) {
    return (
      <EmptyState
        icon={History}
        title="No activity yet"
        description="Changes to products and orders will show up here, with who made them."
      />
    );
  }

  return (
    <ol className="divide-y divide-line">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="text-ink">{entry.summary}</p>
            <p className="truncate text-xs text-slate">{entry.actorEmail}</p>
          </div>
          <time dateTime={entry.createdAt} className="shrink-0 text-xs text-slate">
            {formatWhen(entry.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
