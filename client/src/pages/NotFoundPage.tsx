import { Link } from "react-router";
import { Compass } from "lucide-react";
import EmptyState from "../components/ui/EmptyState";

export default function NotFoundPage() {
  return (
    <main className="page-shell flex min-h-[60vh] flex-col items-center justify-center py-16">
      <EmptyState
        icon={Compass}
        title="That page wandered off"
        description="The page may have moved or the address may be incomplete. Let's get you back to the marketplace."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/" className="flex h-11 items-center rounded-full bg-harbor px-6 text-sm font-semibold text-white! hover:bg-harbor-dark">
              Return home
            </Link>
            <Link to="/search" className="flex h-11 items-center rounded-full border border-line bg-white px-6 text-sm font-semibold text-ink hover:bg-paper">
              Browse products
            </Link>
          </div>
        }
      />
    </main>
  );
}
