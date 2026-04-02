import { ItemComment } from "./itemComment";

export interface Ingredient {
  name: string;
  quantity: number | null; // allow null for "to taste"
  unit: string;            // e.g. g, cup, tbsp
  perServing: boolean;
}

export interface Meal {
  id: string;
  name: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime?: number; // in minutes
  cookTime?: number; // in minutes
  servings?: number;
  tags?: string[];
  mealTime: "breakfast" | "lunch" | "dinner" | "dessert";
  comments?: ItemComment[];
}



