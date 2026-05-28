export function num(s: string | undefined): number {
  if (s == null || s === "") return NaN;
  return Number(s);
}

export function numOr(s: string | undefined, fallback = 0): number {
  const n = num(s);
  return Number.isFinite(n) ? n : fallback;
}
