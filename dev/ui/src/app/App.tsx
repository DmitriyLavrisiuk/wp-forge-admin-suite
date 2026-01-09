import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import AppShell from "../components/layout/AppShell";
import { routes } from "./routes";

export default function App() {
  return (
    <>
      <AppShell>
        <Routes>
          {routes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<route.Component />}
            />
          ))}
        </Routes>
      </AppShell>
      <Toaster position="top-right" richColors />
    </>
  );
}
