/** Datetime tokens emitted in server activity summaries (ISO or space-separated). */
const SUMMARY_DATETIME_RE =
  /\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?/g;

const DISPLAY_DATETIME_OPTIONS = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

/** Human-readable local date/time for activity log timestamps and inline values. */
export function formatActivityDateTime(raw) {
  if (raw == null || raw === "") return raw;
  const s = String(raw).trim();
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, DISPLAY_DATETIME_OPTIONS);
}

/** When an activity was recorded (edit history header line). */
export function formatActivityTimestamp(iso) {
  if (!iso) return "";
  try {
    return formatActivityDateTime(iso);
  } catch {
    return String(iso);
  }
}

/**
 * Turn a semicolon-separated activity summary into display lines with
 * friendly date/time formatting.
 */
export function formatActivitySummaryLines(summary) {
  if (!summary) return [];
  const withDates = String(summary).replace(SUMMARY_DATETIME_RE, (match) => {
    if (!/\d{2}:\d{2}/.test(match)) return match;
    return formatActivityDateTime(match);
  });
  return withDates
    .split(/;\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
