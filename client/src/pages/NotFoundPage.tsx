import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <main className="page-shell flex min-h-[52vh] flex-col items-center justify-center gap-3 py-16 text-center">
      <p className="eyebrow">404 error</p>
      <h1 className="page-title text-ink">That page wandered off</h1>
      <p className="muted max-w-md">The page may have moved or the address may be incomplete. Let’s get you back to the marketplace.</p>
      <Link to="/" className="mt-2 rounded-md bg-harbor px-6 py-2.5 text-sm font-semibold text-white hover:bg-harbor-dark">
        Return home
      </Link>
    </main>
  );
}
