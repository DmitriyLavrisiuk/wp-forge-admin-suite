import { Navigate, Route, Routes } from "react-router-dom";
import { routes } from "./routes";

export default function AppRouter() {
  return (
    <Routes>
      <Route
        path="/general-canonical"
        element={<Navigate to="/general-link-tags" replace />}
      />
      <Route
        path="/unique-canonical"
        element={<Navigate to="/unique-link-tags" replace />}
      />
      <Route
        path="/canonical"
        element={<Navigate to="/general-link-tags" replace />}
      />
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={<route.Component />}
        />
      ))}
    </Routes>
  );
}
