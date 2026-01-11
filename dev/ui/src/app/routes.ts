import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { Globe, Home, ListChecks, Settings } from "lucide-react";
import DashboardPage from "../pages/DashboardPage";
import GeneralCanonicalRulesPage from "../pages/GeneralCanonicalRulesPage";
import SettingsPage from "../pages/SettingsPage";
import UniqueCanonicalRulesPage from "../pages/UniqueCanonicalRulesPage";

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
  {
    path: "/canonical",
    navLabel: "General Canonical Rules",
    pageTitle: "General Canonical Rules",
    Component: GeneralCanonicalRulesPage,
    icon: Globe,
    showInNav: true,
  },
  {
    path: "/unique-canonical",
    navLabel: "Unique Canonical Rules",
    pageTitle: "Unique Canonical Rules",
    Component: UniqueCanonicalRulesPage,
    icon: ListChecks,
    showInNav: true,
  },
];
