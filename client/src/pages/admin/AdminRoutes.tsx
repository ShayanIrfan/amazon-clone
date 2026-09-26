import { Route, Routes } from "react-router";
import AdminLayout from "../../components/admin/AdminLayout";
import NotFoundPage from "../NotFoundPage";
import AdminCustomerDetailPage from "./AdminCustomerDetailPage";
import AdminCustomersPage from "./AdminCustomersPage";
import AdminDashboardPage from "./AdminDashboardPage";
import AdminOrderDetailPage from "./AdminOrderDetailPage";
import AdminOrdersPage from "./AdminOrdersPage";
import AdminProductFormPage from "./AdminProductFormPage";
import AdminProductsPage from "./AdminProductsPage";
import AdminReviewsPage from "./AdminReviewsPage";

// Loaded lazily from App.tsx, so shoppers never download any admin code.
// Paths here are relative to /admin.
export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/new" element={<AdminProductFormPage />} />
        <Route path="products/:id" element={<AdminProductFormPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="orders/:id" element={<AdminOrderDetailPage />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
