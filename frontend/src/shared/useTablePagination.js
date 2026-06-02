import { useEffect, useMemo, useState } from "react";

/**
 * Client-side pagination for in-memory table data.
 * Resets to page 1 when the item list length changes.
 */
export function useTablePagination(items, { pageSize: initialPageSize = 15, sortById = true } = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const sortedItems = useMemo(() => {
    const list = Array.isArray(items) ? [...items] : [];
    if (sortById) {
      list.sort((a, b) => Number(b?.id ?? 0) - Number(a?.id ?? 0));
    }
    return list;
  }, [items, sortById]);

  const total = sortedItems.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [total, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    pagedItems,
    total,
  };
}
