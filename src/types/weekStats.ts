import { Meal } from "./meal";

export interface WeekStats {
  id: string;
    weekStart: string; // ISO date string (YYYY-MM-DD)
    numberOfCampers: number;
    mealsEatingOnTrail: Meal[];
    dietaryRestrictions: string[];
    ageGroup: "intro" | "middle school" | "high school"; // e.g., "children", "adults", "seniors"
}
