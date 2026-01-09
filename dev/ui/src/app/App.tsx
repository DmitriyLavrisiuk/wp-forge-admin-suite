import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import AppShell from "../components/layout/AppShell";
import { appRoutes } from "./routes";

export default function App() {
  return (
    <>
      <AppShell>
        <Routes>
          {appRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </AppShell>
      <Toaster position="top-right" richColors />
    </>
  );
}
