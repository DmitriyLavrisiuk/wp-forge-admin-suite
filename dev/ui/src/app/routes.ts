import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { Globe, Home, ListChecks, Settings } from "lucide-react";
import DashboardPage from "../pages/DashboardPage";
import GeneralLinkTagsPage from "../pages/GeneralLinkTagsPage";
import SettingsPage from "../pages/SettingsPage";
import UniqueLinkTagsPage from "../pages/UniqueLinkTagsPage";

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
    path: "/general-link-tags",
    navLabel: "General Link Tags",
    pageTitle: "General Link Tags",
    Component: GeneralLinkTagsPage,
    icon: Globe,
    showInNav: true,
  },
  {
    path: "/unique-link-tags",
    navLabel: "Unique Link Tags",
    pageTitle: "Unique Link Tags",
    Component: UniqueLinkTagsPage,
    icon: ListChecks,
    showInNav: true,
  },
];
