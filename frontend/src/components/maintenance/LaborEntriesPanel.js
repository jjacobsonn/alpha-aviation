import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createLaborEntry,
  deleteLaborEntry,
  fetchLaborEntries,
} from "../../shared/Api";

function todayIsoDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function LaborEntriesPanel({
  workOrderId,
  canEdit,
  mechanicUsers = [],
  currentUserId,
  onChanged,
  compact = false,
}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    mechanic: currentUserId ? String(currentUserId) : "",
    hours: "",
    work_date: todayIsoDate(),
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!workOrderId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchLaborEntries(workOrderId);
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Could not load labor entries.");
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalHours = useMemo(
    () => entries.reduce((sum, e) => sum + Number(e.hours || 0), 0),
    [entries]
  );

  const handleAdd = async () => {
    const hours = parseFloat(form.hours);
    if (!hours || hours <= 0) {
      setError("Enter valid labor hours.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await createLaborEntry(workOrderId, {
        mechanic: form.mechanic ? Number(form.mechanic) : currentUserId,
        hours,
        work_date: form.work_date,
        notes: form.notes,
      });
      setForm((s) => ({ ...s, hours: "", notes: "" }));
      await load();
      onChanged?.();
    } catch (e) {
      setError(e?.message || "Could not add labor entry.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (entryId) => {
    setBusy(true);
    setError("");
    try {
      await deleteLaborEntry(workOrderId, entryId);
      await load();
      onChanged?.();
    } catch (e) {
      setError(e?.message || "Could not delete entry.");
    } finally {
      setBusy(false);
    }
  };

  if (!workOrderId) return null;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Labor entries
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Total: <strong>{totalHours.toFixed(2)}</strong> h
        </Typography>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError("")}>
          {error}
        </Alert>
      ) : null}

      {loading && !entries.length ? (
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      ) : entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          No labor logged yet.
        </Typography>
      ) : (
        <Table size="small" sx={{ mb: compact ? 1 : 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Mechanic</TableCell>
              <TableCell align="right">Hours</TableCell>
              <TableCell>Notes</TableCell>
              {canEdit ? <TableCell align="right" /> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.work_date}</TableCell>
                <TableCell>{e.mechanic_name || "—"}</TableCell>
                <TableCell align="right">{e.hours}</TableCell>
                <TableCell sx={{ maxWidth: 200 }}>{e.notes || "—"}</TableCell>
                {canEdit ? (
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      disabled={busy}
                      onClick={() => handleDelete(e.id)}
                      aria-label="Delete labor entry"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canEdit ? (
        <Stack spacing={1.5} direction={compact ? "column" : { xs: "column", sm: "row" }} flexWrap="wrap">
          <TextField
            select
            size="small"
            label="Mechanic"
            value={form.mechanic}
            onChange={(e) => setForm((s) => ({ ...s, mechanic: e.target.value }))}
            sx={{ minWidth: 140 }}
          >
            {mechanicUsers.map((u) => (
              <MenuItem key={u.id} value={String(u.id)}>
                {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.username}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Hours"
            type="number"
            inputProps={{ min: 0.25, max: 24, step: 0.25 }}
            value={form.hours}
            onChange={(e) => setForm((s) => ({ ...s, hours: e.target.value }))}
            sx={{ width: 100 }}
          />
          <TextField
            size="small"
            label="Work date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={form.work_date}
            onChange={(e) => setForm((s) => ({ ...s, work_date: e.target.value }))}
            sx={{ width: 160 }}
          />
          <TextField
            size="small"
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            sx={{ flex: 1, minWidth: 120 }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            disabled={busy}
            onClick={handleAdd}
            sx={{ alignSelf: { sm: "center" } }}
          >
            Add
          </Button>
        </Stack>
      ) : null}
    </Box>
  );
}
