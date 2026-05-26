import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";

const EVENT_TYPES = [
  { value: "flight", label: "Flight" },
  { value: "workorder", label: "Work Order" },
  { value: "discrepancy", label: "Discrepancy" },
  { value: "other", label: "Other" },
];

const STATUSES = ["scheduled", "pending", "approved", "open", "delayed", "cancelled", "completed"];

function toDateInput(date) {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTimeInput(date) {
  if (!date) return "";
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AddEventModal({
  open,
  onClose,
  onSave,
  aircraftOptions = [],
  initialValues,
  mode = "create",
}) {
  const defaultValues = useMemo(() => {
    const start = initialValues?.start || new Date();
    const end = initialValues?.end || new Date(start.getTime() + 60 * 60 * 1000);
    return {
      eventType: initialValues?.kind || "flight",
      title: initialValues?.title || "",
      date: toDateInput(start),
      startTime: toTimeInput(start) || "09:00",
      endTime: toTimeInput(end) || "10:00",
      aircraft: initialValues?.aircraft || "",
      route: initialValues?.route || "",
      notes: initialValues?.notes || "",
      status: initialValues?.status || "scheduled",
    };
  }, [initialValues]);

  const [form, setForm] = useState(defaultValues);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(defaultValues);
      setError("");
    }
  }, [open, defaultValues]);

  const submit = () => {
    if (!form.title.trim()) return setError("Title is required.");
    if (!form.date || !form.startTime || !form.endTime) {
      return setError("Date, start time, and end time are required.");
    }
    const start = new Date(`${form.date}T${form.startTime}:00`);
    const end = new Date(`${form.date}T${form.endTime}:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return setError("Please enter valid date/time values.");
    }
    if (end <= start) return setError("End time must be after start time.");
    onSave?.({ ...form, start, end });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === "edit" ? "Edit Event" : "Add Event"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            select
            label="Event Type"
            value={form.eventType}
            onChange={(e) => setForm((s) => ({ ...s, eventType: e.target.value }))}
          >
            {EVENT_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Start Time"
              type="time"
              InputLabelProps={{ shrink: true }}
              value={form.startTime}
              onChange={(e) => setForm((s) => ({ ...s, startTime: e.target.value }))}
              fullWidth
            />
            <TextField
              label="End Time"
              type="time"
              InputLabelProps={{ shrink: true }}
              value={form.endTime}
              onChange={(e) => setForm((s) => ({ ...s, endTime: e.target.value }))}
              fullWidth
            />
          </Stack>
          <TextField
            select
            label="Aircraft"
            value={form.aircraft}
            onChange={(e) => setForm((s) => ({ ...s, aircraft: e.target.value }))}
          >
            <MenuItem value="">None</MenuItem>
            {aircraftOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Route"
            placeholder="KDEN -> KGJT"
            value={form.route}
            onChange={(e) => setForm((s) => ({ ...s, route: e.target.value }))}
          />
          <TextField
            select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
          >
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Notes"
            multiline
            minRows={3}
            value={form.notes}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit}>
          {mode === "edit" ? "Save Changes" : "Save Event"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
