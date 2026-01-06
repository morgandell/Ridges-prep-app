import { Meal } from "./meal";
import { DayOfWeek, MealSlot } from "./menu";

export interface WeekMealSelection {
  day: DayOfWeek;
  slot: MealSlot;
  mealId: string;
}

export interface WeekStats {
  id: string;
    weekStart: string; // ISO date string (YYYY-MM-DD)
    numberOfCampers: number;
    mealsEatingOnTrail: WeekMealSelection[];
    dietaryRestrictions: string[];
    ageGroup: "intro" | "middle school" | "high school"; // e.g., "children", "adults", "seniors"
}
