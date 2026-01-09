import type { ComponentType } from "react";
import DashboardPage from "../pages/DashboardPage";
import SettingsPage from "../pages/SettingsPage";

export type AppRoute = {
  path: string;
  navLabel?: string;
  pageTitle: string;
  Component: ComponentType;
  showInNav?: boolean;
};

export const routes: AppRoute[] = [
  {
    path: "/",
    navLabel: "Dashboard",
    pageTitle: "Дашборд",
    Component: DashboardPage,
    showInNav: true,
  },
  {
    path: "/settings",
    navLabel: "Settings",
    pageTitle: "Настройки",
    Component: SettingsPage,
    showInNav: true,
  },
];
