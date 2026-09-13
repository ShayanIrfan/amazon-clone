// A wordmark in the spirit of Amazon's (dark background, orange "smile"
// swoosh from a to z) for this clone — not the trademarked artwork.
export default function Logo() {
  return (
    <span className="flex flex-col leading-none">
      <span className="text-2xl font-bold tracking-tight text-white italic">amazon-clone</span>
      <svg viewBox="0 0 100 14" className="h-2.5 w-24 text-amazon-orange" aria-hidden>
        <path
          d="M2 2 C 30 16, 70 16, 98 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M92 0 L 100 2 L 94 8 Z" fill="currentColor" />
      </svg>
    </span>
  );
}
