import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { MapPin, Heart, Package, X } from "lucide-react";
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
    <div className="mx-auto max-w-4xl px-4 py-4">
      <h1 className="text-2xl font-medium text-neutral-900">Your Account</h1>
      <p className="text-sm text-neutral-600">
        {user?.name} — {user?.email}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickLink to="/orders" icon={<Package size={20} />} label="Your Orders" />
        <QuickLink to="/account/addresses" icon={<MapPin size={20} />} label="Your Addresses" />
        <QuickLink to="/lists" icon={<Heart size={20} />} label="Your Lists" />
      </div>

      <button
        type="button"
        onClick={async () => {
          await logout();
          navigate("/");
        }}
        className="mt-4 rounded-full border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-50"
      >
        Sign Out
      </button>

      {viewedIds.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-lg font-bold text-neutral-900">Recently viewed</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {viewedIds.map((id) => {
              const product = productsById.get(id);
              if (!product) return null;
              return (
                <div key={id} className="relative w-36 shrink-0 rounded-lg border border-neutral-200 p-2">
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
                    <p className="text-sm font-medium">{formatPrice(product.price)}</p>
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
    <Link to={to} className="flex flex-col items-center gap-1 rounded-lg border border-neutral-200 p-4 text-sm hover:bg-neutral-50">
      {icon}
      {label}
    </Link>
  );
}
