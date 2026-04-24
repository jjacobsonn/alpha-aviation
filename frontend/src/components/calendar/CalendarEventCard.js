import { Box, Chip, Typography } from "@mui/material";

export default function CalendarEventCard({
  event,
  palette,
  variant = "chip",
  onClick,
}) {
  if (variant === "chip") {
    return (
      <Chip
        size="small"
        label={event.title}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(event);
        }}
        sx={{
          borderRadius: 999,
          fontWeight: 600,
          maxWidth: "100%",
          border: "1px solid",
          borderColor: palette.border,
          bgcolor: palette.background,
          color: palette.text,
          cursor: "pointer",
          "& .MuiChip-label": {
            px: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        }}
      />
    );
  }

  return (
    <Box
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
      sx={{
        width: "100%",
        height: "100%",
        borderRadius: 1.5,
        px: 0.85,
        py: 0.65,
        cursor: "pointer",
        border: "1px solid",
        borderColor: palette.border,
        bgcolor: palette.background,
        color: palette.text,
        overflow: "hidden",
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 800, display: "block", lineHeight: 1.2 }}>
        {event.title}
      </Typography>
      {event.timeLabel ? (
        <Typography variant="caption" sx={{ display: "block", opacity: 0.9 }}>
          {event.timeLabel}
        </Typography>
      ) : null}
    </Box>
  );
}
