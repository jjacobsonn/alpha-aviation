import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";

/** Width shared with Site Admin create buttons and table Actions column. */
export const TABLE_ACTIONS_COLUMN_WIDTH = 240;

/** 5, then +10 per step, capped at 50. */
export const SITE_ADMIN_ROWS_PER_PAGE_OPTIONS = [5, 15, 25, 35, 45, 50];

/** Management roster and similar tenant tables. */
export const ROWS_PER_PAGE_OPTIONS_5_10_15 = [5, 10, 15];

export default function TablePaginationBar({
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  total,
  alignWithActions = false,
  rowsPerPageOptions = SITE_ADMIN_ROWS_PER_PAGE_OPTIONS,
}) {
  if (!total) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
        No rows
      </Typography>
    );
  }

  const summary = (
    <Typography variant="body2" color="text.secondary">
      Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
    </Typography>
  );

  const pageArrows = (
    <Stack direction="row" spacing={0.5} alignItems="center" aria-label="Table pagination">
      <IconButton
        size="small"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          typography: "body2",
          fontWeight: 700,
        }}
        aria-current="page"
        aria-label={`Page ${page} of ${pageCount}`}
      >
        {page}
      </Box>
      <IconButton
        size="small"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Stack>
  );

  const rowsSelect =
    onPageSizeChange != null ? (
      <TextField
        select
        size="small"
        label="Rows"
        value={String(pageSize)}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        sx={{ width: 88 }}
      >
        {rowsPerPageOptions.map((n) => (
          <MenuItem key={n} value={String(n)}>
            {n}
          </MenuItem>
        ))}
      </TextField>
    ) : null;

  const paginationControls = (
    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="flex-end">
      {rowsSelect}
      {pageArrows}
    </Stack>
  );

  if (alignWithActions) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", py: 2, gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>{summary}</Box>
        <Box sx={{ flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>{paginationControls}</Box>
      </Box>
    );
  }

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "stretch", sm: "center" }}
      spacing={1.5}
      sx={{ py: 2 }}
    >
      {summary}
      {paginationControls}
    </Stack>
  );
}
