const CAIRO_TZ = "Africa/Cairo";

export type CairoDateParts = {
  year: number;
  month: number;
  day: number;
};

export function getCairoDateParts(date = new Date()): CairoDateParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

export function formatIsoDate(parts: CairoDateParts): string {
  const y = String(parts.year);
  const m = String(parts.month).padStart(2, "0");
  const d = String(parts.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function cairoMonthStart(): string {
  const today = getCairoDateParts();
  return formatIsoDate({ year: today.year, month: today.month, day: 1 });
}

export function cairoTodayIso(): string {
  return formatIsoDate(getCairoDateParts());
}

export function clampRangeToCurrentMonth(
  from: string,
  to: string
): { from: string; to: string; error?: string } {
  const monthStart = cairoMonthStart();
  const today = cairoTodayIso();
  if (from < monthStart) {
    return { from, to, error: "Start date cannot be before the first day of the current month." };
  }
  if (to > today) {
    return { from, to, error: "End date cannot be after today." };
  }
  if (from > to) {
    return { from, to, error: "Start date cannot be after end date." };
  }
  const monthPrefix = monthStart.slice(0, 7);
  if (!from.startsWith(monthPrefix) || !to.startsWith(monthPrefix)) {
    return { from, to, error: "Only dates within the current calendar month are allowed." };
  }
  return { from, to };
}

export function last7DaysRange(): { from: string; to: string } {
  const today = getCairoDateParts();
  const monthStart = cairoMonthStart();
  const to = formatIsoDate(today);
  const weekStart = new Date(Date.UTC(today.year, today.month - 1, today.day));
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const fromParts = {
    year: weekStart.getUTCFullYear(),
    month: weekStart.getUTCMonth() + 1,
    day: weekStart.getUTCDate(),
  };
  const from = formatIsoDate(fromParts);
  return {
    from: from < monthStart ? monthStart : from,
    to,
  };
}
