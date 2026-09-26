import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import PageLoader from "../ui/PageLoader";
import NotFoundPage from "../../pages/NotFoundPage";

/**
 * Sends signed-out visitors to sign in. Signed-in non-admins get the ordinary
 * 404 page rather than an "access denied" screen that confirms /admin exists.
 * This is a convenience only: every admin API route re-checks the role.
 */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader label="Checking your account" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user.isAdmin) return <NotFoundPage />;
  return <>{children}</>;
}
