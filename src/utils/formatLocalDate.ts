/** Format YYYY-MM-DD (or ISO prefix) as a calendar date in local time (avoids UTC day shift). */
export function formatLocalDate(
  iso?: string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return d.toLocaleDateString(undefined, options);
  }
  try {
    return new Date(iso).toLocaleDateString(undefined, options);
  } catch {
    return iso;
  }
}
