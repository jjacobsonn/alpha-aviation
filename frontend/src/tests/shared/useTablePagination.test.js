import { act, renderHook } from "@testing-library/react";
import { useTablePagination } from "../../shared/useTablePagination";

function makeItems(count) {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, label: `row-${i + 1}` }));
}

describe("useTablePagination", () => {
  test("returns a single page when items fit", () => {
    const { result } = renderHook(() => useTablePagination(makeItems(5), { pageSize: 10 }));
    expect(result.current.total).toBe(5);
    expect(result.current.pageCount).toBe(1);
    expect(result.current.pagedItems).toHaveLength(5);
  });

  test("slices items across pages and navigates", () => {
    const { result } = renderHook(() => useTablePagination(makeItems(20), { pageSize: 10 }));
    expect(result.current.pageCount).toBe(2);
    expect(result.current.pagedItems.map((r) => r.id)).toEqual([
      20, 19, 18, 17, 16, 15, 14, 13, 12, 11,
    ]);

    act(() => result.current.setPage(2));
    expect(result.current.pagedItems.map((r) => r.id)).toEqual([
      10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
    ]);
  });

  test("resets to page 1 when page size changes", () => {
    const { result } = renderHook(() => useTablePagination(makeItems(20), { pageSize: 10 }));
    act(() => result.current.setPage(2));
    act(() => result.current.setPageSize(25));
    expect(result.current.page).toBe(1);
    expect(result.current.pagedItems).toHaveLength(20);
  });
});
