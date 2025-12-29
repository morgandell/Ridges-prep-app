import { Meal } from "./meal";

export interface ElectronAPI {
  getMeals: () => Promise<Meal[]>;
  getMeal: (id: string) => Promise<{ success: boolean; meal?: Meal; error?: string }>;
  saveMeal: (meal: Meal) => Promise<{ success: boolean; meal?: Meal; error?: string }>;
  deleteMeal: (id: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

