import { Check } from "lucide-react";

export interface Step {
  key: string;
  label: string;
}

interface Props {
  steps: Step[];
  /** Index of the active step. */
  active: number;
  /** Jump back to an already-completed step. */
  onGoTo?: (index: number) => void;
}

/** Numbered progress steps joined by connectors. Completed steps are buttons that go back. */
export default function Stepper({ steps, active, onGoTo }: Props) {
  return (
    <nav aria-label="Checkout progress">
      <ol className="flex items-center">
        {steps.map((step, i) => {
          const done = i < active;
          const current = i === active;
          const clickable = done && onGoTo;
          const Circle = clickable ? "button" : "div";
          return (
            <li key={step.key} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`} aria-current={current ? "step" : undefined}>
              <Circle
                {...(clickable ? { type: "button" as const, onClick: () => onGoTo(i) } : {})}
                className={`flex items-center gap-2 ${clickable ? "cursor-pointer" : ""}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    done
                      ? "border-harbor bg-harbor text-white"
                      : current
                        ? "border-harbor bg-white text-harbor ring-4 ring-harbor/10"
                        : "border-line-strong bg-white text-slate"
                  }`}
                >
                  {done ? <Check size={16} aria-hidden /> : i + 1}
                </span>
                <span className={`hidden text-sm font-semibold sm:inline ${done || current ? "text-ink" : "text-slate"}`}>{step.label}</span>
              </Circle>
              {i < steps.length - 1 && <span className={`mx-2 h-0.5 flex-1 rounded-full sm:mx-3 ${done ? "bg-harbor" : "bg-line"}`} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
