import { Meal } from "../types/meal";

type Props = {
  meal?: Meal;
  meals: Meal[];
  onChange: (mealId?: string) => void;
};

export default function MealCell({ meal, meals, onChange }: Props) {
  return (
    <select
      value={meal?.id ?? ""}
      onChange={e => onChange(e.target.value || undefined)}
    >
      <option value="">—</option>
      {meals.map(m => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}
