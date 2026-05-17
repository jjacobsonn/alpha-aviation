import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  LinearProgress,
  Link,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import AddIcon from "@mui/icons-material/Add";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  createTrackedComponent,
  downloadComponentHistoryExport,
  fetchCompanyAircrafts,
  fetchComponentHistoryDetail,
  fetchComponentHistorySearch,
} from "../shared/Api";
import useDebouncedValue from "../shared/useDebouncedValue";
import ScrollableTableContainer from "../components/ScrollableTableContainer";

function formatDt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function eventTypeLabel(type) {
  const map = {
    install: "Installed",
    removal: "Removed",
    inspection: "Inspection",
    work_order: "Work order",
    note: "Note",
  };
  return map[type] || type || "—";
}

function todayIsoDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const emptyRegisterForm = {
  part_number: "",
  part_name: "",
  serial_number: "",
  is_serialized: true,
  aircraft: "",
  location: "",
  limit_type: "hours",
  limit_value: "",
  used_value: "",
  installed_at: todayIsoDate(),
  initial_event_summary: "",
  notes: "",
};

function ComponentTimeline({ events }) {
  if (!events?.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No history events yet. Events appear when you register a component or link maintenance work.
      </Typography>
    );
  }
  return (
    <Stack spacing={1.5}>
      {events.map((ev) => (
        <Box
          key={ev.id}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
            <Chip size="small" label={eventTypeLabel(ev.event_type)} color="primary" variant="outlined" />
            <Typography variant="caption" color="text.secondary">
              {formatDt(ev.occurred_at)}
              {ev.actor_name ? ` · ${ev.actor_name}` : ""}
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
            {ev.summary || "—"}
          </Typography>
          {(ev.aircraft_label || ev.work_order_label) && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              {[ev.aircraft_label && `Aircraft: ${ev.aircraft_label}`, ev.work_order_label]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

function LifeLimitSummary({ component }) {
  if (component.component_type !== "serialized" || !component.limit_type) {
    return null;
  }

  const limit = component.limit_value != null ? Number(component.limit_value) : null;
  const used = component.used_value != null ? Number(component.used_value) : 0;
  const remaining = component.remaining_value;
  const pct =
    limit != null && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : null;

  const limitLabel =
    component.limit_type === "calendar"
      ? "Calendar"
      : component.limit_type === "cycles"
        ? "Cycles"
        : "Hours";

  return (
    <Card variant="outlined" sx={{ bgcolor: "action.hover" }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Life limit — {limitLabel}
        </Typography>
        {component.limit_type === "calendar" ? (
          <Typography variant="body2">
            {component.limit_due_date ? `Next due: ${component.limit_due_date}` : "—"}
          </Typography>
        ) : (
          <>
            <Stack direction="row" spacing={2} sx={{ mb: 1 }} flexWrap="wrap">
              <Typography variant="body2">
                Used: <strong>{used}</strong>
                {limit != null ? ` / ${limit}` : ""}
              </Typography>
              {remaining != null ? (
                <Typography variant="body2" color={remaining <= 0 ? "error.main" : "success.main"}>
                  Remaining: <strong>{Math.max(0, remaining)}</strong>
                </Typography>
              ) : null}
            </Stack>
            {pct != null ? (
              <LinearProgress
                variant="determinate"
                value={pct}
                color={pct >= 90 ? "error" : pct >= 75 ? "warning" : "primary"}
                sx={{ height: 8, borderRadius: 1 }}
              />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function ComponentHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(
    searchParams.get("id") ? Number(searchParams.get("id")) : null
  );
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [registerBusy, setRegisterBusy] = useState(false);
  const [aircraft, setAircraft] = useState([]);

  const loadSearch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchComponentHistorySearch({
        q: debouncedQuery.trim() || undefined,
        page_size: 25,
      });
      setResults(Array.isArray(data?.results) ? data.results : []);
      setCount(data?.count ?? 0);
    } catch (e) {
      setError(e?.message || "Could not search components.");
      setResults([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setError("");
    try {
      const data = await fetchComponentHistoryDetail(id);
      setDetail(data);
    } catch (e) {
      setError(e?.message || "Could not load component detail.");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSearch();
  }, [loadSearch]);

  useEffect(() => {
    const params = {};
    if (debouncedQuery.trim()) params.q = debouncedQuery.trim();
    if (selectedId) params.id = String(selectedId);
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, selectedId, setSearchParams]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    fetchCompanyAircrafts()
      .then((data) => setAircraft(Array.isArray(data) ? data : []))
      .catch(() => setAircraft([]));
  }, []);

  const selectComponent = (row) => {
    setSelectedId(row.id);
  };

  const handleExport = async () => {
    if (!selectedId) return;
    setExporting(true);
    setError("");
    try {
      await downloadComponentHistoryExport(selectedId);
    } catch (e) {
      setError(e?.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const handleRegister = async () => {
    setRegisterBusy(true);
    setError("");
    try {
      const payload = {
        part_number: registerForm.part_number.trim(),
        part_name: registerForm.part_name.trim(),
        serial_number: registerForm.is_serialized ? registerForm.serial_number.trim() : "",
        component_type: registerForm.is_serialized ? "serialized" : "consumable",
        location: registerForm.location.trim(),
        installed_at: registerForm.installed_at || null,
        notes: registerForm.notes.trim(),
        initial_event_summary: registerForm.initial_event_summary.trim(),
      };
      if (registerForm.aircraft) {
        payload.aircraft = Number(registerForm.aircraft);
      }
      if (registerForm.is_serialized && registerForm.limit_value) {
        payload.limit_type = registerForm.limit_type;
        payload.limit_value = registerForm.limit_value;
        payload.used_value = registerForm.used_value || "0";
      }
      const created = await createTrackedComponent(payload);
      setRegisterOpen(false);
      setRegisterForm(emptyRegisterForm);
      await loadSearch();
      if (created?.id) {
        setSelectedId(created.id);
      }
    } catch (e) {
      setError(e?.message || "Could not register component.");
    } finally {
      setRegisterBusy(false);
    }
  };

  const header = detail || results.find((r) => r.id === selectedId);

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 2, md: 3 }, minWidth: 0 }}>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <PrecisionManufacturingIcon color="primary" sx={{ fontSize: { xs: 28, sm: 32 }, mt: 0.25 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: "1.35rem", sm: "2rem" } }}>
                  Component history
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Track individual parts over time — installs, removals, and life limits.
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="outlined"
                size="small"
                startIcon={<HelpOutlineIcon />}
                onClick={() => setHelpOpen((o) => !o)}
              >
                {helpOpen ? "Hide help" : "How this works"}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setRegisterOpen(true)}
              >
                Register component
              </Button>
            </Stack>
          </Stack>

          <Collapse in={helpOpen}>
            <Alert severity="info" icon={false} sx={{ "& .MuiAlert-message": { width: "100%" } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Parts catalog vs. component history
              </Typography>
              <Stack spacing={1} component="ul" sx={{ m: 0, pl: 2.5 }}>
                <Typography component="li" variant="body2">
                  <strong>Parts</strong> (<Link component={RouterLink} to="/parts">open Parts</Link>) — your
                  company catalog and stock counts (how many brake pads you have on the shelf).
                </Typography>
                <Typography component="li" variant="body2">
                  <strong>Component history</strong> (this page) — a specific item you track over time, like
                  hydraulic pump <em>S/N 12345</em> on tail N521SB, or a filter batch tracked by part number only.
                </Typography>
                <Typography component="li" variant="body2">
                  <strong>Part number</strong> — manufacturer ID (e.g. P-2002). <strong>Serial number</strong> —
                  unique ID on one rotable unit (leave blank for consumables).
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                To get started: click <strong>Register component</strong> above, or run{" "}
                <code>python manage.py bootstrap_component_history</code> for demo data.
              </Typography>
            </Alert>
          </Collapse>

          {error ? <Alert severity="error" onClose={() => setError("")}>{error}</Alert> : null}

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent sx={{ py: { xs: 1.5, sm: 2 } }}>
              <TextField
                fullWidth
                size="small"
                label="Search tracked components"
                placeholder="Part number, serial number, name, tail, or location…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                {loading ? "Searching…" : `${count} tracked component${count === 1 ? "" : "s"} found`}
              </Typography>
            </CardContent>
          </Card>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: selectedId ? "minmax(280px, 1fr) minmax(320px, 1.4fr)" : "1fr" },
              gap: 2,
              alignItems: "start",
            }}
          >
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", minWidth: 0 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Tracked components
                </Typography>
                {loading && !results.length ? (
                  <Stack alignItems="center" py={3}>
                    <CircularProgress size={28} />
                  </Stack>
                ) : results.length === 0 ? (
                  <Stack spacing={2} alignItems="flex-start">
                    <Typography color="text.secondary">
                      {debouncedQuery.trim()
                        ? "No matches. Try another part or serial number, or register a new component."
                        : "Nothing registered yet. Add your first tracked component to build a timeline."}
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setRegisterOpen(true)}>
                      Register component
                    </Button>
                  </Stack>
                ) : (
                  <ScrollableTableContainer minWidth={720}>
                    <Table
                      size="small"
                      sx={{
                        "& .MuiTableCell-head": {
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          bgcolor: "action.hover",
                        },
                      }}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell>Part number</TableCell>
                          <TableCell>Serial #</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>On aircraft / location</TableCell>
                          <TableCell align="right">Events</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {results.map((row) => (
                          <TableRow
                            key={row.id}
                            hover
                            selected={selectedId === row.id}
                            onClick={() => selectComponent(row)}
                            sx={{ cursor: "pointer" }}
                          >
                            <TableCell sx={{ fontWeight: selectedId === row.id ? 700 : 400 }}>
                              {row.part_number}
                            </TableCell>
                            <TableCell>{row.serial_number || "—"}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={row.component_type === "serialized" ? "Rotable" : "Consumable"}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{row.aircraft_label || row.location || "—"}</TableCell>
                            <TableCell align="right">{row.event_count ?? 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollableTableContainer>
                )}
              </CardContent>
            </Card>

            {selectedId ? (
              <Card elevation={0} sx={{ border: "2px solid", borderColor: "primary.main", minWidth: 0 }}>
                <CardContent>
                  {detailLoading ? (
                    <Stack alignItems="center" py={4}>
                      <CircularProgress />
                    </Stack>
                  ) : header ? (
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        spacing={2}
                      >
                        <Box>
                          <Typography variant="overline" color="text.secondary">
                            Selected component
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800 }}>
                            {header.part_name || header.part_number}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Part # <strong>{header.part_number}</strong>
                            {header.serial_number ? (
                              <>
                                {" "}
                                · Serial # <strong>{header.serial_number}</strong>
                              </>
                            ) : null}
                          </Typography>
                          <Chip
                            size="small"
                            sx={{ mt: 1 }}
                            label={header.component_type === "serialized" ? "Rotable (serialized)" : "Consumable"}
                          />
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {header.aircraft_label
                              ? `Installed on: ${header.aircraft_label}`
                              : `Location: ${header.location || "—"}`}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          startIcon={<DownloadIcon />}
                          onClick={handleExport}
                          disabled={exporting}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          Export CSV
                        </Button>
                      </Stack>

                      <LifeLimitSummary component={header} />

                      <Divider />

                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        History timeline
                      </Typography>
                      <ComponentTimeline events={detail?.events} />
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">Component not found.</Typography>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </Box>
        </Stack>
      </Container>

      <Dialog open={registerOpen} onClose={() => !registerBusy && setRegisterOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Register tracked component</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              This creates a trackable item for compliance history. Stock quantities still live on the{" "}
              <Link component={RouterLink} to="/parts" onClick={() => setRegisterOpen(false)}>
                Parts
              </Link>{" "}
              page.
            </Typography>
            <TextField
              label="Part number"
              required
              placeholder="e.g. P-2002"
              value={registerForm.part_number}
              onChange={(e) => setRegisterForm((s) => ({ ...s, part_number: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Part name"
              placeholder="e.g. Hydraulic pump assembly"
              value={registerForm.part_name}
              onChange={(e) => setRegisterForm((s) => ({ ...s, part_name: e.target.value }))}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={registerForm.is_serialized}
                  onChange={(e) =>
                    setRegisterForm((s) => ({ ...s, is_serialized: e.target.checked }))
                  }
                />
              }
              label="Rotable part (has a unique serial number)"
            />
            {registerForm.is_serialized ? (
              <TextField
                label="Serial number"
                required
                placeholder="e.g. HYD-1001"
                value={registerForm.serial_number}
                onChange={(e) => setRegisterForm((s) => ({ ...s, serial_number: e.target.value }))}
                fullWidth
              />
            ) : null}
            <TextField
              select
              label="Aircraft (optional)"
              value={registerForm.aircraft}
              onChange={(e) => setRegisterForm((s) => ({ ...s, aircraft: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">Not on an aircraft</MenuItem>
              {aircraft.map((a) => (
                <MenuItem key={a.id} value={String(a.id)}>
                  {a.registration_number} — {a.model}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Location"
              placeholder="Hangar shelf, shop stock, etc."
              value={registerForm.location}
              onChange={(e) => setRegisterForm((s) => ({ ...s, location: e.target.value }))}
              fullWidth
            />
            {registerForm.is_serialized ? (
              <>
                <TextField
                  select
                  label="Life limit type"
                  value={registerForm.limit_type}
                  onChange={(e) => setRegisterForm((s) => ({ ...s, limit_type: e.target.value }))}
                  fullWidth
                >
                  <MenuItem value="hours">Hours</MenuItem>
                  <MenuItem value="cycles">Cycles</MenuItem>
                  <MenuItem value="calendar">Calendar</MenuItem>
                </TextField>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Limit"
                    type="number"
                    value={registerForm.limit_value}
                    onChange={(e) => setRegisterForm((s) => ({ ...s, limit_value: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Used so far"
                    type="number"
                    value={registerForm.used_value}
                    onChange={(e) => setRegisterForm((s) => ({ ...s, used_value: e.target.value }))}
                    fullWidth
                  />
                </Stack>
              </>
            ) : null}
            <TextField
              label="Install / start date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={registerForm.installed_at}
              onChange={(e) => setRegisterForm((s) => ({ ...s, installed_at: e.target.value }))}
              fullWidth
            />
            <TextField
              label="First history note"
              placeholder="e.g. Installed during 100-hour inspection"
              value={registerForm.initial_event_summary}
              onChange={(e) =>
                setRegisterForm((s) => ({ ...s, initial_event_summary: e.target.value }))
              }
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterOpen(false)} disabled={registerBusy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={registerBusy || !registerForm.part_number.trim()}
            onClick={handleRegister}
          >
            {registerBusy ? "Saving…" : "Register"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
