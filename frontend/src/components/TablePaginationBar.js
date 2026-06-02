import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, IconButton, Stack, Typography } from "@mui/material";

/** Width shared with Site Admin create buttons and table Actions column. */
export const TABLE_ACTIONS_COLUMN_WIDTH = 240;

export default function TablePaginationBar({
  page,
  pageCount,
  pageSize,
  onPageChange,
  total,
  alignWithActions = false,
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

  const controls = (
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

  if (alignWithActions) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", py: 2, gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>{summary}</Box>
        <Box
          sx={{
            width: TABLE_ACTIONS_COLUMN_WIDTH,
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          {controls}
        </Box>
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
      {controls}
    </Stack>
  );
}
