import {
  formatActivityDateTime,
  formatActivitySummaryLines,
} from "../../shared/activitySummaryFormat";

describe("activitySummaryFormat", () => {
  test("formatActivityDateTime parses space-separated backend labels", () => {
    const out = formatActivityDateTime("2026-06-03 19:13:00");
    expect(out).toMatch(/Jun/);
    expect(out).toMatch(/2026/);
    expect(out).not.toMatch(/2026-06-03 19:13:00/);
  });

  test("formatActivitySummaryLines splits and formats flight change summary", () => {
    const lines = formatActivitySummaryLines(
      "Departure 2026-06-03 19:13:00 → 2026-06-04 19:13:00; Arrival 2026-06-03 20:13:00 → 2026-06-04 20:13:00"
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^Departure /);
    expect(lines[1]).toMatch(/^Arrival /);
    expect(lines.join(" ")).not.toMatch(/2026-06-03 19:13:00/);
  });
});
