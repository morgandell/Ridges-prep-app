import { COLORS } from "../constants/colors";

/** Warm → cool gradient for route point order (start → end). */
export const ROUTE_GRADIENT_START = COLORS.breakfast;
export const ROUTE_GRADIENT_END = COLORS.dinner;

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function interpolateHex(colorA: string, colorB: string, t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);
  return rgbToHex(
    Math.round(r1 + (r2 - r1) * clamped),
    Math.round(g1 + (g2 - g1) * clamped),
    Math.round(b1 + (b2 - b1) * clamped),
  );
}

/** Color for a point at `index` in a list of `total` ordered points. */
export function getRoutePointColor(index: number, total: number): string {
  if (total <= 1) return ROUTE_GRADIENT_START;
  return interpolateHex(ROUTE_GRADIENT_START, ROUTE_GRADIENT_END, index / (total - 1));
}
