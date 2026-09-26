// Harbor Market wordmark: an anchor mark on a deep-teal tile beside the name.
// The mark is inline SVG (from the Stitch brand file), so it needs no request
// and scales crisply at any size.
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden focusable="false">
      <rect width="32" height="32" rx="9" fill="#0F3A40" />
      <path
        d="M16 9V24M16 24C11.5 24 9 20.5 9 17M16 24C20.5 24 23 20.5 23 17M11.5 12.5H20.5"
        stroke="#E3F1EA"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="8.5" r="2.1" fill="#E3F1EA" />
    </svg>
  );
}

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={compact ? 30 : 36} />
      <span className={`whitespace-nowrap font-extrabold tracking-[-0.035em] text-harbor ${compact ? "text-lg" : "text-[1.35rem]"}`}>
        Harbor<span className="font-medium"> Market</span>
      </span>
    </span>
  );
}
