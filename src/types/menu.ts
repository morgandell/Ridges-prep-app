export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export type MealSlot = "breakfast" | "lunch" | "dinner" | "dessert" | "snack";

export type Menu = {
  days: {
    [day in DayOfWeek]: {
      [slot in MealSlot]?: string; // mealId
    };
  };
};

