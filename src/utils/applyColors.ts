// src/constants/applyColors.ts
import { COLORS } from "../constants/colors";

export function applyColors() {
  const root = document.documentElement;

  const colorEntries: [string, string][] = Object.entries(COLORS).map(
    ([key, value]) => [`--color-${key}`, value]
  );

  colorEntries.forEach(([varName, value]) => {
    root.style.setProperty(varName, value);
  });
}
