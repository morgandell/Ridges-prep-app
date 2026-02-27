import { Meal } from "./meal";
import { DayOfWeek, MealSlot } from "./menu";

export interface WeekMealSelection {
  day: DayOfWeek;
  slot: MealSlot;
  mealId: string;
  note?: string; // Editable note for this specific meal
}

export interface WeekStats {
  id: string;
    weekStart: string; // ISO date string (YYYY-MM-DD)
    numberOfCampers: number;
    routeId?: string | null; // Optional: one route assigned per week
    mealsEatingOnTrail: WeekMealSelection[];
    camperRestrictions: CamperRestriction[];
    ageGroup: "intro" | "middle school" | "high school"; // e.g., "children", "adults", "seniors"
    mealOverrides?: { // Week-specific meal swaps that override the menu
      [day in DayOfWeek]?: {
        [slot in MealSlot]?: string; // mealId
      };
    };
}

export type CamperRestriction = {
  id: string;              // stable key for React + edits
  name: string;            // camper name or identifier
  restrictions: string[];  // ["vegetarian", "gluten free"]
  draftRestriction: string;
};
