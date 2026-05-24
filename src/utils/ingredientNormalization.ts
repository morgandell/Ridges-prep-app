const PIECE_UNITS = new Set(["pcs", "pc", "piece", "pieces"]);

function singularizeWord(word: string): string {
  if (word.length <= 2) return word;

  if (word.endsWith("ies") && word.length > 4) {
    return word.slice(0, -3) + "y";
  }

  if (word.endsWith("oes") && word.length > 4) {
    return word.slice(0, -2);
  }

  if (word.endsWith("es") && word.length > 3) {
    if (/[sxz]es$/.test(word) || /[cs]hes$/.test(word)) {
      return word.slice(0, -2);
    }
  }

  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) {
    return word.slice(0, -1);
  }

  return word;
}

export function normalizeIngredientName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizeWord)
    .join(" ");
}

export function normalizeUnitForMerge(unit: string): string {
  const normalized = (unit || "pcs").trim().toLowerCase();
  if (PIECE_UNITS.has(normalized)) return "pieces";
  return normalized;
}

export function formatUnitForDisplay(
  unit: string,
  quantity: number | null
): string {
  const normalized = (unit || "pcs").trim().toLowerCase();
  if (PIECE_UNITS.has(normalized)) {
    return quantity === 1 ? "piece" : "pieces";
  }
  if (normalized === "l") return "L";
  if (normalized === "ml") return "mL";
  return unit || "";
}

export function formatIngredientDisplayName(normalizedName: string): string {
  return normalizedName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ingredientMergeKey(
  name: string,
  unit: string,
  perServing: boolean
): string {
  return `${normalizeIngredientName(name)}|${normalizeUnitForMerge(unit)}|${perServing}`;
}
