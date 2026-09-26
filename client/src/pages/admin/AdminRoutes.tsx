import { Route, Routes } from "react-router";
import AdminLayout from "../../components/admin/AdminLayout";
import NotFoundPage from "../NotFoundPage";
import AdminDashboardPage from "./AdminDashboardPage";
import AdminProductFormPage from "./AdminProductFormPage";
import AdminProductsPage from "./AdminProductsPage";

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
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
