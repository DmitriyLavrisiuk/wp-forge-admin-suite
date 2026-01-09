import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { Home, Settings } from "lucide-react";
import DashboardPage from "../pages/DashboardPage";
import SettingsPage from "../pages/SettingsPage";

export type AppRoute = {
  path: string;
  navLabel?: string;
  pageTitle: string;
  Component: ComponentType;
  icon: LucideIcon;
  showInNav?: boolean;
};

export const routes: AppRoute[] = [
  {
    path: "/",
    navLabel: "Dashboard",
    pageTitle: "Дашборд",
    Component: DashboardPage,
    icon: Home,
    showInNav: true,
  },
  {
    path: "/settings",
    navLabel: "Settings",
    pageTitle: "Настройки",
    Component: SettingsPage,
    icon: Settings,
    showInNav: true,
  },
];
