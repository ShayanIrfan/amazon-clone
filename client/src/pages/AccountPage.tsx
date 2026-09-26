import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { LogOut, MapPin, Heart, Package, ShieldCheck, X, type LucideIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useRecentlyViewed, useRemoveRecentlyViewed } from "../hooks/useRecentlyViewed";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import AccountNav from "../components/account/AccountNav";
import PageHeader from "../components/ui/PageHeader";

const TILES: { to: string; icon: LucideIcon; label: string; description: string }[] = [
  { to: "/orders", icon: Package, label: "Your orders", description: "Track, cancel or buy again" },
  { to: "/account/addresses", icon: MapPin, label: "Your addresses", description: "Manage delivery addresses" },
  { to: "/lists", icon: Heart, label: "Your lists", description: "Products saved for later" },
  { to: "/account/security", icon: ShieldCheck, label: "Login & security", description: "Password and 2-step verification" },
];

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: viewedData } = useRecentlyViewed();
  const removeViewed = useRemoveRecentlyViewed();

  const viewedIds = (viewedData?.items ?? []).map((v) => v.productId);
  const { data: productsData } = useQuery({
    queryKey: ["recentlyViewedProducts", viewedIds],
    queryFn: () => api.productsByIds(viewedIds),
    enabled: viewedIds.length > 0,
  });
  const productsById = new Map((productsData?.items ?? []).map((p) => [p._id, p]));

  return (
    <div className="page-shell py-8">
      <PageHeader
        eyebrow="Account overview"
        title={`Hi, ${user?.name?.split(" ")[0] ?? "there"}`}
        description={user?.email}
        actions={
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            className="flex h-10 items-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            <LogOut size={16} aria-hidden /> Sign out
          </button>
        }
      />

      <div className="mt-6">
        <AccountNav />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TILES.map(({ to, icon: Icon, label, description }) => (
          <Link key={to} to={to} className="surface surface-hover flex items-center gap-4 rounded-2xl p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mint text-harbor">
              <Icon size={22} aria-hidden />
            </span>
            <span>
              <span className="block font-bold text-ink">{label}</span>
              <span className="block text-sm text-slate">{description}</span>
            </span>
          </Link>
        ))}
      </div>

      {viewedIds.length > 0 && (
        <div className="mt-12">
          <h2 className="section-title mb-4 text-xl!">Recently viewed</h2>
          <div className="scroll-snap-x flex gap-4 overflow-x-auto pb-2">
            {viewedIds.map((id) => {
              const product = productsById.get(id);
              if (!product) return null;
              return (
                <div key={id} className="surface relative w-40 shrink-0 rounded-2xl p-3">
                  <button
                    type="button"
                    onClick={() => removeViewed.mutate(id)}
                    aria-label="Remove from recently viewed"
                    className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate shadow-[var(--shadow-card)] hover:text-clay"
                  >
                    <X size={14} aria-hidden />
                  </button>
                  <Link to={`/product/${product._id}`}>
                    <div className="flex aspect-square items-center justify-center rounded-xl bg-paper p-3">
                      <img src={product.thumbnail} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-medium text-ink">{product.title}</p>
                    <p className="amount mt-1 text-sm font-extrabold text-ink">{formatPrice(product.price)}</p>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
