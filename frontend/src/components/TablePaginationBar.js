import { MenuItem, Pagination, Stack, TextField, Typography } from "@mui/material";

export default function TablePaginationBar({
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  total,
  rowsPerPageOptions = [10, 15, 25, 50],
}) {
  if (!total) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
        No rows
      </Typography>
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
      <Typography variant="body2" color="text.secondary">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </Typography>
      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="flex-end">
        <TextField
          select
          size="small"
          label="Rows"
          value={String(pageSize)}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          sx={{ width: 100 }}
        >
          {rowsPerPageOptions.map((n) => (
            <MenuItem key={n} value={String(n)}>
              {n}
            </MenuItem>
          ))}
        </TextField>
        {pageCount > 1 ? (
          <Pagination
            page={page}
            count={pageCount}
            onChange={(_, p) => onPageChange(p)}
            size="small"
            color="primary"
          />
        ) : null}
      </Stack>
    </Stack>
  );
}
