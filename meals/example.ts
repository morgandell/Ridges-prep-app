export type Meal = {
  id: string;
  name: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients?: string[];
  instructions?: string[];
  tags?: string[];
  mealTime: "breakfast" | "lunch" | "dinner" | "snack";
};

export const exampleMeals: Meal[] = [
  {
    id: "meal-1",
    name: "Chicken Burrito Bowl",
    description: "A high-protein burrito bowl that’s easy to prep for the week.",
    prepTime: 15,
    cookTime: 25,
    servings: 4,
    ingredients: [
      "2 chicken breasts",
      "1 cup white rice",
      "1 can black beans",
      "1 bell pepper",
      "1 tsp cumin",
      "1 tsp chili powder",
      "Salt & pepper"
    ],
    instructions: [
      "Cook rice according to package instructions.",
      "Season chicken with cumin, chili powder, salt, and pepper.",
      "Pan-sear chicken until fully cooked, then slice.",
      "Sauté bell pepper until tender.",
      "Assemble bowls with rice, beans, chicken, and peppers."
    ],
    tags: ["high-protein", "meal prep", "lunch"],
    mealTime: "lunch"
  },
  {
    id: "meal-2",
    name: "Salmon & Roasted Veggies",
    description: "Simple baked salmon with roasted vegetables.",
    prepTime: 10,
    cookTime: 20,
    servings: 2,
    ingredients: [
      "2 salmon fillets",
      "1 cup broccoli",
      "1 cup carrots",
      "1 tbsp olive oil",
      "Lemon",
      "Garlic",
      "Salt & pepper"
    ],
    instructions: [
      "Preheat oven to 400°F (205°C).",
      "Toss vegetables with olive oil, salt, and pepper.",
      "Place salmon on baking sheet and season with garlic and lemon.",
      "Bake everything for 18–20 minutes."
    ],
    tags: ["dinner", "healthy", "gluten-free"],
    mealTime: "dinner"
  },
  {
    id: "meal-3",
    name: "Overnight Oats",
    description: "No-cook breakfast that’s ready in the morning.",
    prepTime: 5,
    cookTime: 0,
    servings: 1,
    ingredients: [
      "1/2 cup rolled oats",
      "1/2 cup milk",
      "1 tbsp chia seeds",
      "1 tbsp honey",
      "Fresh berries"
    ],
    instructions: [
      "Combine oats, milk, chia seeds, and honey in a jar.",
      "Stir well and seal.",
      "Refrigerate overnight.",
      "Top with berries before eating."
    ],
    tags: ["breakfast", "quick", "vegetarian"],
    mealTime: "breakfast"
  },
  {
    id: "meal-4",
    name: "Turkey & Avocado Sandwich",
    description: "Quick, balanced sandwich for busy days.",
    prepTime: 5,
    cookTime: 0,
    servings: 1,
    ingredients: [
      "2 slices whole wheat bread",
      "3 slices turkey",
      "1/2 avocado",
      "Lettuce",
      "Mustard"
    ],
    instructions: [
      "Toast bread if desired.",
      "Mash avocado onto one slice.",
      "Layer turkey and lettuce.",
      "Top with mustard and second slice of bread."
    ],
    tags: ["lunch", "quick", "no-cook"],
    mealTime: "lunch"
  },
  {
    id: "meal-5",
    name: "Spaghetti with Marinara",
    description: "Classic comfort food with a simple tomato sauce.",
    prepTime: 10,
    cookTime: 30,
    servings: 4,
    ingredients: [
      "1 lb spaghetti",
      "1 jar marinara sauce",
      "2 cloves garlic",
      "1 tbsp olive oil",
      "Parmesan cheese"
    ],
    instructions: [
      "Boil pasta according to package instructions.",
      "Heat olive oil and sauté garlic.",
      "Add marinara sauce and simmer.",
      "Drain pasta and combine with sauce.",
      "Serve topped with parmesan."
    ],
    tags: ["dinner", "comfort food", "vegetarian"],
    mealTime: "dinner"
  }
];
