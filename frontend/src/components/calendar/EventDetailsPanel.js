import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

export default function EventDetailsPanel({
  open,
  event,
  onClose,
  onEdit,
  onDelete,
  palette,
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{event?.title || "Event details"}</DialogTitle>
      <DialogContent>
        {event ? (
          <Stack spacing={1.25} sx={{ mt: 1 }}>
            <Chip
              size="small"
              label={event.typeLabel || "Event"}
              sx={{
                alignSelf: "flex-start",
                fontWeight: 700,
                border: "1px solid",
                borderColor: palette?.border,
                bgcolor: palette?.background,
                color: palette?.text,
              }}
            />
            <Typography variant="body2" color="text.secondary">{event.timeLabel || "All day"}</Typography>
            {event.aircraft ? <Typography variant="body2"><strong>Aircraft:</strong> {event.aircraft}</Typography> : null}
            {event.route ? <Typography variant="body2"><strong>Route:</strong> {event.route}</Typography> : null}
            {event.status ? <Typography variant="body2"><strong>Status:</strong> {event.status}</Typography> : null}
            {event.workRef ? <Typography variant="body2"><strong>Reference:</strong> {event.workRef}</Typography> : null}
            {event.notes ? <Typography variant="body2"><strong>Notes:</strong> {event.notes}</Typography> : null}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {event?.editable ? <Button onClick={() => onEdit?.(event)}>Edit</Button> : null}
        {event?.editable ? (
          <Button color="error" onClick={() => onDelete?.(event)}>
            Delete
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
