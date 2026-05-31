const RECENCY_FIELDS = [
  "updated_at",
  "created_at",
  "date_joined",
  "departure_time",
  "arrival_time",
  "date_reported",
  "due_by",
];

function parseTime(value) {
  if (value == null || value === "") return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function recencyMs(item) {
  if (!item || typeof item !== "object") return null;
  for (const field of RECENCY_FIELDS) {
    const ms = parseTime(item[field]);
    if (ms != null) return ms;
  }
  return null;
}

/** Newest rows first (by date fields, then descending id). */
export function sortByNewestFirst(items) {
  if (!Array.isArray(items) || items.length <= 1) {
    return Array.isArray(items) ? items : [];
  }
  return [...items].sort((a, b) => {
    const aMs = recencyMs(a);
    const bMs = recencyMs(b);
    if (aMs != null && bMs != null && aMs !== bMs) {
      return bMs - aMs;
    }
    return Number(b?.id ?? 0) - Number(a?.id ?? 0);
  });
}
