import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { MapPin, Heart, Package, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useRecentlyViewed, useRemoveRecentlyViewed } from "../hooks/useRecentlyViewed";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";

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
    <div className="page-shell py-6">
      <p className="eyebrow">Account overview</p>
      <h1 className="page-title mt-1 text-ink">Your Account</h1>
      <p className="mt-2 text-sm text-slate">
        {user?.name} — {user?.email}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickLink to="/orders" icon={<Package size={20} />} label="Your Orders" />
        <QuickLink to="/account/addresses" icon={<MapPin size={20} />} label="Your Addresses" />
        <QuickLink to="/lists" icon={<Heart size={20} />} label="Your Lists" />
        <QuickLink to="/account/security" icon={<ShieldCheck size={20} />} label="Login & Security" />
      </div>

      <button
        type="button"
        onClick={async () => {
          await logout();
          navigate("/");
        }}
        className="mt-5 rounded-md border border-line-strong bg-white px-4 py-2 text-sm font-semibold text-harbor hover:bg-paper"
      >
        Sign Out
      </button>

      {viewedIds.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-ink">Recently viewed</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {viewedIds.map((id) => {
              const product = productsById.get(id);
              if (!product) return null;
              return (
                <div key={id} className="surface-hover surface relative w-40 shrink-0 rounded-md p-2">
                  <button
                    type="button"
                    onClick={() => removeViewed.mutate(id)}
                    aria-label="Remove from view"
                    className="absolute top-1 right-1 rounded-full bg-white p-0.5 text-neutral-500 hover:text-amazon-red"
                  >
                    <X size={14} />
                  </button>
                  <Link to={`/product/${product._id}`}>
                    <div className="flex aspect-square items-center justify-center bg-white">
                      <img src={product.thumbnail} alt={product.title} className="max-h-full max-w-full object-contain" />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-800">{product.title}</p>
                    <p className="amount text-sm font-medium">{formatPrice(product.price)}</p>
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

function QuickLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link to={to} className="surface-hover flex flex-col items-center gap-2 rounded-md border border-line bg-white p-5 text-sm font-semibold text-harbor hover:bg-paper">
      {icon}
      {label}
    </Link>
  );
}
