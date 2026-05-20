import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
  ListSubheader,
  MenuItem,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ScheduleIcon from "@mui/icons-material/Schedule";
import VerifiedIcon from "@mui/icons-material/Verified";
import ModuleSearchBar from "../search/ModuleSearchBar";
import ScrollableTableContainer from "../ScrollableTableContainer";
import { useAppContext } from "../../context/AppContext";
import {
  createTool,
  deleteTool,
  fetchCompanyUsers,
  fetchToolCalibrationHistory,
  fetchTools,
  recordToolCalibration,
  updateTool,
} from "../../shared/Api";
import { profileDisplayName } from "../../shared/profileDisplay";
import useDebouncedValue from "../../shared/useDebouncedValue";
import {
  TOOLS_STATUS_FILTERS,
  buildToolsSuggestions,
  filterToolsRows,
} from "../../shared/moduleSearch";

function todayIsoDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addYearsIso(isoDate, years = 1) {
  if (!isoDate) return todayIsoDate();
  const [y, m, day] = isoDate.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  d.setFullYear(d.getFullYear() + years);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString();
  } catch {
    return String(iso);
  }
}

function truncate(str, max = 48) {
  const t = (str || "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function DetailField({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: "break-word" }}>
        {value || "—"}
      </Typography>
    </Box>
  );
}

function calibrationStatusMeta(tool) {
  const alert = tool?.calibration_alert;
  if (alert === "red") return { label: "Overdue", color: "error" };
  if (alert === "amber") return { label: "Due soon", color: "warning" };
  return { label: "OK", color: "success" };
}

function computeToolStats(tools) {
  const list = tools || [];
  return {
    total: list.length,
    overdue: list.filter((t) => t.calibration_alert === "red").length,
    dueSoon: list.filter((t) => t.calibration_alert === "amber").length,
    ok: list.filter((t) => t.calibration_alert === "green").length,
  };
}

const emptyToolForm = {
  name: "",
  serial_number: "",
  description: "",
  location: "",
  calibration_due_date: todayIsoDate(),
};

const CALIBRATION_STAFF_ROLES = ["owner", "manager", "mechanic"];

const ROLE_LABELS = {
  owner: "Owner",
  manager: "Manager",
  mechanic: "Mechanic",
};

const emptyCalibrationForm = {
  calibration_date: todayIsoDate(),
  performedByMode: "staff",
  staffId: "",
  vendorName: "",
  next_due_date: addYearsIso(todayIsoDate(), 1),
  notes: "",
};

function resolvePerformedByLabel(form, staffById) {
  if (form.performedByMode === "vendor") {
    return form.vendorName.trim();
  }
  const user = staffById.get(Number(form.staffId));
  return profileDisplayName(user);
}

const STAT_CARD_SIZE = 188;

function StatCard({ title, value, icon, color, loading, onClick, selected }) {
  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        width: STAT_CARD_SIZE,
        height: STAT_CARD_SIZE,
        flexShrink: 0,
        border: "2px solid",
        borderColor: selected ? color : "divider",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: selected ? 2 : 0,
        "&:hover": onClick ? { borderColor: color, boxShadow: 2 } : undefined,
      }}
    >
      <CardContent
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          "&:last-child": { pb: 2 },
        }}
      >
        <Stack spacing={1} alignItems="center" textAlign="center" sx={{ width: "100%" }}>
          <Box sx={{ color, display: "flex", "& svg": { fontSize: 36 } }}>{icon}</Box>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              lineHeight: 1.25,
              minHeight: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {title}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, color, lineHeight: 1 }}>
            {loading ? "—" : value}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function CalibrationHistoryTable({ records, loading }) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (!records?.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No calibrations recorded yet.
      </Typography>
    );
  }
  return (
    <ScrollableTableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Performed by</TableCell>
            <TableCell>Next due</TableCell>
            <TableCell>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{formatDate(r.calibration_date)}</TableCell>
              <TableCell>{r.performed_by || "—"}</TableCell>
              <TableCell>{formatDate(r.next_due_date)}</TableCell>
              <TableCell sx={{ maxWidth: 200, wordBreak: "break-word" }}>
                {r.notes || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollableTableContainer>
  );
}

/** Calibrated shop equipment (torque wrenches, test stands, etc.) — embedded on Parts page. */
export default function ToolsCalibrationPanel() {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("lg"));
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const { state } = useAppContext();
  const effectiveRole = state.viewAsUser?.role || state.user?.role;
  const canDeleteTools = effectiveRole === "owner" && !state.viewAsUser;

  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedQuery = useDebouncedValue(query, 300);

  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(() => {
    const raw = searchParams.get("tool");
    return raw ? Number(raw) : null;
  });
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState(emptyToolForm);
  const [calForm, setCalForm] = useState(emptyCalibrationForm);
  const [saving, setSaving] = useState(false);
  const [companyUsers, setCompanyUsers] = useState([]);

  const staffOptions = useMemo(
    () =>
      (companyUsers || []).filter((u) =>
        CALIBRATION_STAFF_ROLES.includes(u?.company_role)
      ),
    [companyUsers]
  );

  const staffById = useMemo(() => {
    const map = new Map();
    staffOptions.forEach((u) => map.set(Number(u.id), u));
    return map;
  }, [staffOptions]);

  const loadTools = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchTools();
      setTools(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Could not load tools.");
      setTools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (id) => {
    if (!id) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const data = await fetchToolCalibrationHistory(id);
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Could not load calibration history.");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  useEffect(() => {
    let mounted = true;
    fetchCompanyUsers()
      .then((data) => {
        if (mounted) setCompanyUsers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (mounted) setCompanyUsers([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadHistory(selectedId);
  }, [selectedId, loadHistory]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set("tab", "tools");
        if (selectedId) params.set("tool", String(selectedId));
        else params.delete("tool");
        return params;
      },
      { replace: true }
    );
  }, [selectedId, setSearchParams]);

  const stats = useMemo(() => computeToolStats(tools), [tools]);
  const filtered = useMemo(
    () => filterToolsRows(tools, debouncedQuery, statusFilter),
    [tools, debouncedQuery, statusFilter]
  );
  const suggestions = useMemo(
    () => buildToolsSuggestions(tools, query),
    [tools, query]
  );
  const selectedTool = useMemo(
    () => tools.find((t) => t.id === selectedId) || null,
    [tools, selectedId]
  );

  const selectTool = (id) => {
    setSelectedId(id === selectedId ? null : id);
  };

  const handleStatClick = (filter) => {
    setStatusFilter((prev) => (prev === filter ? "all" : filter));
  };

  const openAdd = () => {
    setForm(emptyToolForm);
    setAddOpen(true);
  };

  const openEdit = () => {
    if (!selectedTool) return;
    setForm({
      name: selectedTool.name || "",
      serial_number: selectedTool.serial_number || "",
      description: selectedTool.description || "",
      location: selectedTool.location || "",
      calibration_due_date: selectedTool.calibration_due_date || todayIsoDate(),
    });
    setEditOpen(true);
  };

  const openRecordCalibration = () => {
    const actor = state.viewAsUser || state.user;
    const actorId = actor?.id != null ? String(actor.id) : "";
    const onStaffList = staffOptions.some((u) => String(u.id) === actorId);
    setCalForm({
      calibration_date: todayIsoDate(),
      performedByMode: onStaffList ? "staff" : staffOptions.length ? "staff" : "vendor",
      staffId: onStaffList
        ? actorId
        : staffOptions[0]?.id != null
          ? String(staffOptions[0].id)
          : "",
      vendorName: "",
      next_due_date: addYearsIso(todayIsoDate(), 1),
      notes: "",
    });
    setCalOpen(true);
  };

  const handleSaveTool = async (isEdit) => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        serial_number: form.serial_number.trim(),
        description: form.description.trim() || "",
        location: form.location.trim() || "",
        calibration_due_date: form.calibration_due_date,
      };
      if (isEdit && selectedId) {
        await updateTool(selectedId, payload);
      } else {
        const created = await createTool(payload);
        if (created?.id) setSelectedId(created.id);
      }
      setAddOpen(false);
      setEditOpen(false);
      await loadTools();
    } catch (e) {
      setError(e?.message || "Could not save tool.");
    } finally {
      setSaving(false);
    }
  };

  const handleRecordCalibration = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      const performedBy = resolvePerformedByLabel(calForm, staffById);
      await recordToolCalibration(selectedId, {
        calibration_date: calForm.calibration_date,
        performed_by: performedBy,
        next_due_date: calForm.next_due_date,
        notes: calForm.notes.trim() || undefined,
      });
      setCalOpen(false);
      await loadTools();
      await loadHistory(selectedId);
    } catch (e) {
      setError(e?.message || "Could not record calibration.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      await deleteTool(selectedId);
      setDeleteOpen(false);
      setSelectedId(null);
      await loadTools();
    } catch (e) {
      setError(e?.message || "Could not delete tool.");
    } finally {
      setSaving(false);
    }
  };

  const toolFormFields = (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField
        label="Name"
        required
        fullWidth
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <TextField
        label="Serial number"
        required
        fullWidth
        value={form.serial_number}
        onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
      />
      <TextField
        label="Description"
        fullWidth
        multiline
        minRows={2}
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
      />
      <TextField
        label="Location"
        fullWidth
        placeholder="Tool crib, hangar, etc."
        value={form.location}
        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
      />
      <TextField
        label="Calibration due date"
        type="date"
        required
        fullWidth
        InputLabelProps={{ shrink: true }}
        value={form.calibration_due_date}
        onChange={(e) =>
          setForm((f) => ({ ...f, calibration_due_date: e.target.value }))
        }
      />
    </Stack>
  );

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          startIcon={isPhone ? undefined : <AddIcon />}
          onClick={openAdd}
          sx={{ whiteSpace: "nowrap" }}
        >
          Add tool
        </Button>
      </Stack>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2.5,
          justifyContent: "center",
          alignItems: "stretch",
          width: "100%",
          py: 0.5,
        }}
      >
        <StatCard
          title="Total tools"
          value={stats.total}
          loading={loading}
          color="primary.main"
          icon={<BuildCircleIcon />}
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          loading={loading}
          color="error.main"
          icon={<ErrorOutlineIcon />}
          onClick={() => handleStatClick("overdue")}
          selected={statusFilter === "overdue"}
        />
        <StatCard
          title="Due soon"
          value={stats.dueSoon}
          loading={loading}
          color="warning.main"
          icon={<ScheduleIcon />}
          onClick={() => handleStatClick("due_soon")}
          selected={statusFilter === "due_soon"}
        />
        <StatCard
          title="OK"
          value={stats.ok}
          loading={loading}
          color="success.main"
          icon={<VerifiedIcon />}
          onClick={() => handleStatClick("ok")}
          selected={statusFilter === "ok"}
        />
      </Box>

      {error ? (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      ) : null}

      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
        <CardContent>
          <ModuleSearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search name, serial number, location…"
            suggestions={suggestions}
            statusOptions={TOOLS_STATUS_FILTERS}
            statusValue={statusFilter}
            onStatusChange={setStatusFilter}
            statusVariant="chips"
            resultCount={filtered.length}
            totalCount={stats.total}
          />
        </CardContent>
      </Card>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: selectedId && !isCompact ? "minmax(280px, 1fr) minmax(360px, 1.2fr)" : "1fr",
          },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : filtered.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                {tools.length === 0
                  ? "No tools yet. Add your first calibrated tool to get started."
                  : "No tools match your search or filters."}
              </Typography>
            ) : (
              <ScrollableTableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Equipment</TableCell>
                      <TableCell>S/N</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Due</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((tool) => {
                      const meta = calibrationStatusMeta(tool);
                      const selected = tool.id === selectedId;
                      return (
                        <TableRow
                          key={tool.id}
                          hover
                          selected={selected}
                          onClick={() => selectTool(tool.id)}
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell sx={{ maxWidth: 280 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: selected ? 700 : 500 }}
                            >
                              {tool.name}
                            </Typography>
                            {tool.description ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                sx={{ mt: 0.25 }}
                              >
                                {truncate(tool.description, 56)}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>{tool.serial_number}</TableCell>
                          <TableCell>{tool.location || "—"}</TableCell>
                          <TableCell>{formatDate(tool.calibration_due_date)}</TableCell>
                          <TableCell>
                            <Chip size="small" label={meta.label} color={meta.color} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollableTableContainer>
            )}
          </CardContent>
        </Card>

        {selectedId && (isCompact || selectedTool) ? (
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              {!selectedTool ? (
                <CircularProgress size={28} />
              ) : (
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {selectedTool.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={calibrationStatusMeta(selectedTool).label}
                      color={calibrationStatusMeta(selectedTool).color}
                    />
                  </Stack>

                  <Card variant="outlined" sx={{ bgcolor: "action.hover" }}>
                    <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <DetailField
                            label="Description"
                            value={selectedTool.description}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <DetailField
                            label="Serial number"
                            value={selectedTool.serial_number}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <DetailField label="Location" value={selectedTool.location} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <DetailField
                            label="Next calibration due"
                            value={formatDate(selectedTool.calibration_due_date)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <DetailField
                            label="Status"
                            value={calibrationStatusMeta(selectedTool).label}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button variant="contained" size="small" onClick={openRecordCalibration}>
                      Record calibration
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditOutlinedIcon />}
                      onClick={openEdit}
                    >
                      Edit
                    </Button>
                    {canDeleteTools ? (
                      <IconButton
                        color="error"
                        size="small"
                        aria-label="Delete tool"
                        onClick={() => setDeleteOpen(true)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    ) : null}
                  </Stack>

                  <Typography variant="subtitle2" sx={{ fontWeight: 700, pt: 1 }}>
                    Calibration history
                  </Typography>
                  <CalibrationHistoryTable records={history} loading={historyLoading} />
                </Stack>
              )}
            </CardContent>
          </Card>
        ) : null}
      </Box>

      <Dialog open={addOpen} onClose={() => !saving && setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add tool</DialogTitle>
        <DialogContent>{toolFormFields}</DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={saving || !form.name.trim() || !form.serial_number.trim()}
            onClick={() => handleSaveTool(false)}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit tool</DialogTitle>
        <DialogContent>{toolFormFields}</DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={saving || !form.name.trim() || !form.serial_number.trim()}
            onClick={() => handleSaveTool(true)}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={calOpen} onClose={() => !saving && setCalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record calibration</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Calibration date"
              type="date"
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={calForm.calibration_date}
              onChange={(e) => {
                const date = e.target.value;
                setCalForm((f) => ({
                  ...f,
                  calibration_date: date,
                  next_due_date: addYearsIso(date, 1),
                }));
              }}
            />
            <TextField
              select
              label="Performed by"
              required
              fullWidth
              value={
                calForm.performedByMode === "vendor"
                  ? "vendor"
                  : calForm.staffId
                    ? `staff:${calForm.staffId}`
                    : ""
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === "vendor") {
                  setCalForm((f) => ({ ...f, performedByMode: "vendor" }));
                } else if (v.startsWith("staff:")) {
                  setCalForm((f) => ({
                    ...f,
                    performedByMode: "staff",
                    staffId: v.slice(6),
                  }));
                }
              }}
              helperText="In-house staff or an external calibration lab"
            >
              <ListSubheader>Company staff</ListSubheader>
              {staffOptions.length === 0 ? (
                <MenuItem disabled value="">
                  No staff loaded
                </MenuItem>
              ) : (
                staffOptions.map((u) => (
                  <MenuItem key={u.id} value={`staff:${u.id}`}>
                    {profileDisplayName(u)}
                    {u.company_role
                      ? ` (${ROLE_LABELS[u.company_role] || u.company_role})`
                      : ""}
                  </MenuItem>
                ))
              )}
              <Divider />
              <MenuItem value="vendor">External calibration vendor…</MenuItem>
            </TextField>
            {calForm.performedByMode === "vendor" ? (
              <TextField
                label="Vendor name"
                required
                fullWidth
                placeholder="e.g. J.A. King Calibration Services"
                value={calForm.vendorName}
                onChange={(e) =>
                  setCalForm((f) => ({ ...f, vendorName: e.target.value }))
                }
              />
            ) : null}
            <TextField
              label="Next due date"
              type="date"
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={calForm.next_due_date}
              onChange={(e) => setCalForm((f) => ({ ...f, next_due_date: e.target.value }))}
            />
            <TextField
              label="Notes"
              fullWidth
              multiline
              minRows={2}
              value={calForm.notes}
              onChange={(e) => setCalForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              saving ||
              !resolvePerformedByLabel(calForm, staffById)
            }
            onClick={handleRecordCalibration}
          >
            {saving ? "Saving…" : "Record"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => !saving && setDeleteOpen(false)}>
        <DialogTitle>Delete tool?</DialogTitle>
        <DialogContent>
          <Typography>
            This removes {selectedTool?.name} and all calibration history. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button color="error" variant="contained" disabled={saving} onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
