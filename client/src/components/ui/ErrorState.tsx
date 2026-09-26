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
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-clay/10" aria-hidden>
        <TriangleAlert size={28} className="text-clay" />
      </span>
      <h2 className="text-lg font-extrabold tracking-[-0.01em] text-ink">{message}</h2>
      <p className="max-w-sm text-sm text-slate">{detail}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}
