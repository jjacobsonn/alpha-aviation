jest.mock("axios", () => ({ get: jest.fn() }));

import {
  buildClientCsvContent,
  escapeCsvField,
  CSV_ACCEPT_HEADER,
} from "../../shared/csvExport";

describe("csvExport", () => {
  test("CSV_ACCEPT_HEADER allows csv and fallback types", () => {
    expect(CSV_ACCEPT_HEADER).toContain("text/csv");
    expect(CSV_ACCEPT_HEADER).toContain("*/*");
  });

  test("escapeCsvField quotes fields with commas", () => {
    expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""');
    expect(escapeCsvField("a,b")).toBe('"a,b"');
  });

  test("buildClientCsvContent joins headers and rows", () => {
    const csv = buildClientCsvContent(["id", "name"], [[1, "Test, Inc"]]);
    expect(csv).toBe('id,name\n1,"Test, Inc"');
  });
});
