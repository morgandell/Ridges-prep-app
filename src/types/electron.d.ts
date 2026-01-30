import { Meal } from "./meal";
import { WeekStats } from "./weekStats";
import { Menu } from "./menu";
import { PastMenu } from "./pastMenu";
import { Route } from "./route";

export interface ElectronAPI {
  getMeals: () => Promise<Meal[]>;
  getMeal: (id: string) => Promise<{ success: boolean; meal?: Meal; error?: string }>;
  saveMeal: (meal: Meal) => Promise<{ success: boolean; meal?: Meal; error?: string }>;
  deleteMeal: (id: string) => Promise<{ success: boolean; error?: string }>;

   // Weekly menu 
  getMenu: () => Promise<Menu>;
  saveMenu: (menu: Menu) => Promise<{ success: boolean; error?: string }>;

  // Week stats
  getWeekStats: () => Promise<{ success: boolean; weeks?: WeekStats[]; error?: string }>;
  saveWeekStats: (week: WeekStats) => Promise<{ success: boolean; error?: string }>;

  // Past menus
  getPastMenus: () => Promise<{ success: boolean; pastMenus?: PastMenu[]; error?: string }>;
  savePastMenu: (pastMenu: PastMenu) => Promise<{ success: boolean; pastMenu?: PastMenu; error?: string }>;
  deletePastMenu: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Routes
  getRoutes: () => Promise<{ success: boolean; routes?: Route[]; error?: string }>;
  saveRoute: (route: Route) => Promise<{ success: boolean; route?: Route; error?: string }>;
  deleteRoute: (id: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

