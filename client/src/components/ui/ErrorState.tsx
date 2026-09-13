import { TriangleAlert } from "lucide-react";
import Button from "./Button";

interface Props {
  message?: string;
  detail?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = "Something went wrong.", detail = "Check your connection and try again.", onRetry }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <TriangleAlert size={40} className="text-line-strong" aria-hidden />
      <h2 className="text-lg font-semibold text-ink">{message}</h2>
      <p className="max-w-sm text-sm text-slate">{detail}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  );
}
