import { Meal } from "./meal";
import { WeekStats } from "./weekStats";

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

}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

