import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import AdminLayout from "../components/layout/AdminLayout";
import DashboardPage from "../pages/DashboardPage";
import SettingsPage from "../pages/SettingsPage";

export default function App() {
  return (
    <>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AdminLayout>
      <Toaster position="top-right" richColors />
    </>
  );
}
