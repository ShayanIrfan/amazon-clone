import { Route, Routes } from "react-router";
import AdminLayout from "../../components/admin/AdminLayout";
import NotFoundPage from "../NotFoundPage";
import AdminDashboardPage from "./AdminDashboardPage";

// Loaded lazily from App.tsx, so shoppers never download any admin code.
// Paths here are relative to /admin.
export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
