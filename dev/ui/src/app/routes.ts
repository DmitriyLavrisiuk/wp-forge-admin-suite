import DashboardPage from "../pages/DashboardPage";
import SettingsPage from "../pages/SettingsPage";

export type AppRoute = {
  path: string;
  navLabel?: string;
  pageTitle: string;
  element: JSX.Element;
};

export const appRoutes: AppRoute[] = [
  {
    path: "/",
    navLabel: "Dashboard",
    pageTitle: "Дашборд",
    element: <DashboardPage />,
  },
  {
    path: "/settings",
    navLabel: "Settings",
    pageTitle: "Настройки",
    element: <SettingsPage />,
  },
];
