import { Box, Typography } from "@mui/material";
import { TABLE_ACTIONS_COLUMN_WIDTH } from "./TablePaginationBar";

export default function SiteAdminSectionHeader({ title, action = null }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Typography variant="h5" sx={{ flex: 1, fontWeight: 700, color: "text.primary", minWidth: 0 }}>
        {title}
      </Typography>
      {action ? (
        <Box
          sx={{
            width: TABLE_ACTIONS_COLUMN_WIDTH,
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          {action}
        </Box>
      ) : null}
    </Box>
  );
}
