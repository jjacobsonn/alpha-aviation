import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import CloseIcon from "@mui/icons-material/Close";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCompanyFlightRequest,
  createDiscrepancy,
  fetchCompanyAircrafts,
  fetchCompanyDiscrepancies,
  fetchCompanyFlights,
  fetchCompanyUsers,
  fetchCurrentUser,
} from "../shared/Api";
import { useAppContext } from "../context/AppContext";
import { isPlatformAdmin } from "../shared/rbac";

const FLIGHT_TYPES = [
  { value: "training", label: "Training" },
  { value: "charter", label: "Charter" },
  { value: "positioning", label: "Positioning" },
  { value: "maintenance ferry", label: "Maintenance ferry" },
];

const PILOT_REQ = [
  { value: "private", label: "Private" },
  { value: "student", label: "Student" },
  { value: "commercial", label: "Commercial" },
  { value: "airline", label: "Airline" },
];

const INITIAL_FLIGHT_FORM = {
  aircraft: "",
  flight_number: "",
  origin: "",
  destination: "",
  departure_time: "",
  arrival_time: "",
  route: "",
  flight_type: "training",
  pilot_requirement: "private",
  secondary_pilot: "",
};

const INITIAL_DISC_FORM = {
  aircraft: "",
  ata_code: "",
  tach_time: "",
  description: "",
};

function statusChip(status) {
  const s = status || "";
  if (s === "approved" || s === "scheduled") return <Chip size="small" color="success" label={s} />;
  if (s === "pending approval") return <Chip size="small" color="warning" label="Pending approval" />;
  if (s === "completed") return <Chip size="small" variant="outlined" label="Completed" />;
  if (s === "cancelled" || s === "delayed") return <Chip size="small" color="default" label={s} />;
  return <Chip size="small" variant="outlined" label={s || "—"} />;
}

function formatDt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function toIsoFromDatetimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function toId(v) {
  if (v === null || v === undefined || v === "") return Number.NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  if (typeof v === "object") {
    const id = v?.id ?? v?.pk ?? v?.user?.id ?? v?.pilot?.id;
    return id === undefined ? Number.NaN : Number(id);
  }
  return Number.NaN;
}

export default function PilotDashboard() {
  const { state } = useAppContext();
  const platformAdmin = isPlatformAdmin(state.user);
  const hasCompanyContext =
    Boolean(state.user?.companyId) || Boolean(localStorage.getItem("adminCompanyId"));
  const companyName =
    state.user?.companyName ||
    (() => {
      try {
        const raw = localStorage.getItem("adminCompanyId");
        return raw ? `Company #${raw}` : "";
      } catch {
        return "";
      }
    })();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flights, setFlights] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [submittingFlight, setSubmittingFlight] = useState(false);
  const [creatingDisc, setCreatingDisc] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [requestFlightOpen, setRequestFlightOpen] = useState(false);
  const [reportDiscrepancyOpen, setReportDiscrepancyOpen] = useState(false);

  const [flightForm, setFlightForm] = useState(INITIAL_FLIGHT_FORM);
  const [discForm, setDiscForm] = useState(INITIAL_DISC_FORM);

  const pilotNameById = useMemo(() => {
    const map = new Map();
    if (currentUser?.id) {
      const meName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ").trim();
      map.set(Number(currentUser.id), meName || currentUser.username || `User #${currentUser.id}`);
    }
    (pilots || []).forEach((p) => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      map.set(Number(p.id), name || p.username || `User #${p.id}`);
    });
    return map;
  }, [pilots, currentUser]);

  const load = useCallback(async () => {
    if (platformAdmin && !hasCompanyContext) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [me, allFlights, allDisc, acList, users] = await Promise.all([
        fetchCurrentUser(),
        fetchCompanyFlights(),
        fetchCompanyDiscrepancies(),
        fetchCompanyAircrafts(),
        fetchCompanyUsers(),
      ]);
      setCurrentUser(me || null);
      const uid = Number(me?.id);
      const list = Array.isArray(allFlights) ? allFlights : [];
      const mine = list.filter((f) => {
        const pid = toId(f?.primary_pilot ?? f?.primary_pilot_id);
        const sid = toId(f?.secondary_pilot ?? f?.secondary_pilot_id);
        return pid === uid || sid === uid;
      });
      setFlights(mine);
      setDiscrepancies(Array.isArray(allDisc) ? allDisc : []);
      setAircraft(Array.isArray(acList) ? acList : []);
      setPilots(
        (Array.isArray(users) ? users : []).filter(
          (u) => u.company_role === "pilot" && Number(u.id) !== uid
        )
      );
    } catch (e) {
      setError(e?.message || "Failed to load pilot dashboard.");
    } finally {
      setLoading(false);
    }
  }, [platformAdmin, hasCompanyContext]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingMyRequests = useMemo(
    () => flights.filter((f) => f?.status === "pending approval").length,
    [flights]
  );

  const upcomingCount = useMemo(() => {
    const now = Date.now();
    return flights.filter((f) => {
      if (f?.status === "cancelled") return false;
      const t = f?.departure_time ? new Date(f.departure_time).getTime() : 0;
      return t >= now || f?.status === "pending approval";
    }).length;
  }, [flights]);

  const myDiscs = useMemo(() => {
    const uid = Number(currentUser?.id);
    return discrepancies.filter((d) => Number(d?.reporter) === uid);
  }, [discrepancies, currentUser]);

  const handleSubmitFlightRequest = async () => {
    if (!flightForm.aircraft || !flightForm.origin || !flightForm.destination) {
      setError("Aircraft, origin, and destination are required.");
      return;
    }
    const dep = toIsoFromDatetimeLocal(flightForm.departure_time);
    const arr = toIsoFromDatetimeLocal(flightForm.arrival_time);
    if (!dep || !arr) {
      setError("Departure and arrival date and time are required.");
      return;
    }
    setSubmittingFlight(true);
    setError("");
    try {
      await createCompanyFlightRequest({
        aircraft: Number(flightForm.aircraft),
        flight_number: flightForm.flight_number || undefined,
        origin: flightForm.origin,
        destination: flightForm.destination,
        departure_time: dep,
        arrival_time: arr,
        route: flightForm.route || "",
        flight_type: flightForm.flight_type,
        pilot_requirement: flightForm.pilot_requirement,
        secondary_pilot: flightForm.secondary_pilot ? Number(flightForm.secondary_pilot) : null,
      });
      setFlightForm(INITIAL_FLIGHT_FORM);
      setRequestFlightOpen(false);
      await load();
    } catch (e) {
      setError(e?.message || "Could not submit flight request.");
    } finally {
      setSubmittingFlight(false);
    }
  };

  const handleCreateDiscrepancy = async () => {
    if (!currentUser?.id || !discForm.aircraft || !discForm.description) {
      setError("Aircraft and description are required.");
      return;
    }
    setCreatingDisc(true);
    setError("");
    try {
      await createDiscrepancy({
        work_order: null,
        aircraft: Number(discForm.aircraft),
        reporter: Number(currentUser.id),
        date_reported: new Date().toISOString().slice(0, 10),
        description: discForm.description,
        ata_code: discForm.ata_code || "",
        tach_time: discForm.tach_time || "",
        status: "pending",
      });
      setDiscForm(INITIAL_DISC_FORM);
      setReportDiscrepancyOpen(false);
      const disc = await fetchCompanyDiscrepancies();
      setDiscrepancies(Array.isArray(disc) ? disc : []);
    } catch (e) {
      setError(e?.message || "Failed to submit discrepancy.");
    } finally {
      setCreatingDisc(false);
    }
  };

  const roleOnFlight = (f) => {
    const uid = Number(currentUser?.id);
    if (toId(f?.primary_pilot ?? f?.primary_pilot_id) === uid) return "Primary";
    if (toId(f?.secondary_pilot ?? f?.secondary_pilot_id) === uid) return "Secondary";
    return "—";
  };

  const displayValue = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v);
  };

  const displayChoice = (v) => {
    if (!v) return "—";
    return String(v)
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const displayPilot = (pilotIdOrName) => {
    if (pilotIdOrName === null || pilotIdOrName === undefined || pilotIdOrName === "") return "None";
    if (typeof pilotIdOrName === "string" && Number.isNaN(Number(pilotIdOrName))) return pilotIdOrName;
    const id = Number(pilotIdOrName);
    if (Number.isNaN(id)) return displayValue(pilotIdOrName);
    return pilotNameById.get(id) || `User #${id}`;
  };

  if (platformAdmin && !hasCompanyContext) {
    return (
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh", py: 4 }}>
        <Container maxWidth="lg">
          <Alert severity="info">
            Select a company under Organizations to use the pilot dashboard as that tenant.
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Pilot
            </Typography>
            {companyName ? (
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Organization: {companyName}
              </Typography>
            ) : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <FlightTakeoffIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Assigned flights
                    </Typography>
                  </Stack>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {loading ? "—" : flights.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <AssignmentIcon color="warning" />
                    <Typography variant="body2" color="text.secondary">
                      Pending approval
                    </Typography>
                  </Stack>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {loading ? "—" : pendingMyRequests}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <ReportProblemIcon color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Upcoming / active
                    </Typography>
                  </Stack>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {loading ? "—" : upcomingCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Quick actions
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Open forms in modals to keep this page clean on mobile.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ flex: 1 }}
                  onClick={() => {
                    setError("");
                    setRequestFlightOpen(true);
                  }}
                  disabled={loading}
                >
                  Request flight
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ flex: 1 }}
                  onClick={() => {
                    setError("");
                    setReportDiscrepancyOpen(true);
                  }}
                  disabled={loading}
                >
                  Report discrepancy
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                My flights
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Your assigned and requested flights.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Flight #</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Aircraft</TableCell>
                    <TableCell>Route</TableCell>
                    <TableCell>Departure</TableCell>
                    <TableCell>Arrival</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography color="text.secondary">Loading…</Typography>
                      </TableCell>
                    </TableRow>
                  ) : flights.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography color="text.secondary">No flights assigned yet.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    flights.map((f) => (
                      <TableRow
                        key={f.id}
                        hover
                        onClick={() => setSelectedFlight(f)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedFlight(f);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell>{statusChip(f.status)}</TableCell>
                        <TableCell>{f.flight_number || "—"}</TableCell>
                        <TableCell>{roleOnFlight(f)}</TableCell>
                        <TableCell>{f.aircraft_name || f.aircraft || "—"}</TableCell>
                        <TableCell>
                          {(f.origin || "—") + " → " + (f.destination || "—")}
                        </TableCell>
                        <TableCell>{formatDt(f.departure_time)}</TableCell>
                        <TableCell>{formatDt(f.arrival_time)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog
            open={Boolean(selectedFlight)}
            onClose={() => setSelectedFlight(null)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                pr: 0.5,
              }}
            >
              <Typography variant="inherit">Flight submission details</Typography>
              <IconButton
                aria-label="Close"
                onClick={() => setSelectedFlight(null)}
                edge="end"
                sx={{ mr: 0.5 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {selectedFlight ? (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Read-only submitted values
                    </Typography>
                    {statusChip(selectedFlight.status)}
                  </Stack>
                  <TextField
                    label="Flight number"
                    size="small"
                    fullWidth
                    value={displayValue(selectedFlight.flight_number)}
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    label="Aircraft"
                    size="small"
                    fullWidth
                    value={displayValue(selectedFlight.aircraft_name || selectedFlight.aircraft)}
                    InputProps={{ readOnly: true }}
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Origin"
                      size="small"
                      fullWidth
                      value={displayValue(selectedFlight.origin)}
                      InputProps={{ readOnly: true }}
                    />
                    <TextField
                      label="Destination"
                      size="small"
                      fullWidth
                      value={displayValue(selectedFlight.destination)}
                      InputProps={{ readOnly: true }}
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Departure"
                      size="small"
                      fullWidth
                      value={formatDt(selectedFlight.departure_time)}
                      InputProps={{ readOnly: true }}
                    />
                    <TextField
                      label="Arrival"
                      size="small"
                      fullWidth
                      value={formatDt(selectedFlight.arrival_time)}
                      InputProps={{ readOnly: true }}
                    />
                  </Stack>
                  <TextField
                    label="Route notes"
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    value={displayValue(selectedFlight.route || selectedFlight.route_notes)}
                    InputProps={{ readOnly: true }}
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Flight type"
                      size="small"
                      fullWidth
                      value={displayChoice(selectedFlight.flight_type)}
                      InputProps={{ readOnly: true }}
                    />
                    <TextField
                      label="Certificate requirement"
                      size="small"
                      fullWidth
                      value={displayChoice(selectedFlight.pilot_requirement)}
                      InputProps={{ readOnly: true }}
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Secondary pilot"
                      size="small"
                      fullWidth
                      value={displayValue(
                        displayPilot(selectedFlight.secondary_pilot_name || selectedFlight.secondary_pilot)
                      )}
                      InputProps={{ readOnly: true }}
                    />
                    <TextField
                      label="Your role"
                      size="small"
                      fullWidth
                      value={roleOnFlight(selectedFlight)}
                      InputProps={{ readOnly: true }}
                    />
                  </Stack>
                </Stack>
              ) : null}
            </DialogContent>
          </Dialog>

          <Dialog
            open={requestFlightOpen}
            onClose={() => setRequestFlightOpen(false)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>Request a flight</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2} sx={{ pt: 0.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="pilot-req-aircraft-label">Aircraft</InputLabel>
                  <Select
                    id="pilot-req-aircraft"
                    labelId="pilot-req-aircraft-label"
                    label="Aircraft"
                    value={flightForm.aircraft}
                    onChange={(e) => setFlightForm((s) => ({ ...s, aircraft: e.target.value }))}
                  >
                    {aircraft.map((a) => (
                      <MenuItem key={a.id} value={String(a.id)}>
                        {a.registration_number} ({a.model})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Flight number (optional)"
                  size="small"
                  value={flightForm.flight_number}
                  onChange={(e) => setFlightForm((s) => ({ ...s, flight_number: e.target.value }))}
                  fullWidth
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Origin"
                    size="small"
                    value={flightForm.origin}
                    onChange={(e) => setFlightForm((s) => ({ ...s, origin: e.target.value }))}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Destination"
                    size="small"
                    value={flightForm.destination}
                    onChange={(e) => setFlightForm((s) => ({ ...s, destination: e.target.value }))}
                    fullWidth
                    required
                  />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Departure"
                    type="datetime-local"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={flightForm.departure_time}
                    onChange={(e) => setFlightForm((s) => ({ ...s, departure_time: e.target.value }))}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Arrival"
                    type="datetime-local"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={flightForm.arrival_time}
                    onChange={(e) => setFlightForm((s) => ({ ...s, arrival_time: e.target.value }))}
                    fullWidth
                    required
                  />
                </Stack>
                <TextField
                  label="Route notes (optional)"
                  size="small"
                  value={flightForm.route}
                  onChange={(e) => setFlightForm((s) => ({ ...s, route: e.target.value }))}
                  fullWidth
                />
                <FormControl fullWidth size="small">
                  <InputLabel id="pilot-req-ftype-label">Flight type</InputLabel>
                  <Select
                    id="pilot-req-ftype"
                    labelId="pilot-req-ftype-label"
                    label="Flight type"
                    value={flightForm.flight_type}
                    onChange={(e) => setFlightForm((s) => ({ ...s, flight_type: e.target.value }))}
                  >
                    {FLIGHT_TYPES.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel id="pilot-req-cert-label">Certificate requirement</InputLabel>
                  <Select
                    id="pilot-req-cert"
                    labelId="pilot-req-cert-label"
                    label="Certificate requirement"
                    value={flightForm.pilot_requirement}
                    onChange={(e) =>
                      setFlightForm((s) => ({ ...s, pilot_requirement: e.target.value }))
                    }
                  >
                    {PILOT_REQ.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel id="pilot-req-sec-label">Secondary pilot (optional)</InputLabel>
                  <Select
                    id="pilot-req-sec"
                    labelId="pilot-req-sec-label"
                    label="Secondary pilot (optional)"
                    value={flightForm.secondary_pilot}
                    onChange={(e) => setFlightForm((s) => ({ ...s, secondary_pilot: e.target.value }))}
                  >
                    <MenuItem value="">None</MenuItem>
                    {pilots.map((p) => (
                      <MenuItem key={p.id} value={String(p.id)}>
                        {p.first_name} {p.last_name} ({p.username})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRequestFlightOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSubmitFlightRequest}
                disabled={submittingFlight || loading}
              >
                {submittingFlight ? "Submitting…" : "Submit request"}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={reportDiscrepancyOpen}
            onClose={() => setReportDiscrepancyOpen(false)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>Report a discrepancy</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2} sx={{ pt: 0.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="pilot-disc-aircraft-label">Aircraft</InputLabel>
                  <Select
                    id="pilot-disc-aircraft"
                    labelId="pilot-disc-aircraft-label"
                    label="Aircraft"
                    value={discForm.aircraft}
                    onChange={(e) => setDiscForm((s) => ({ ...s, aircraft: e.target.value }))}
                  >
                    {aircraft.map((a) => (
                      <MenuItem key={a.id} value={String(a.id)}>
                        {a.registration_number} ({a.model})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="ATA code"
                    size="small"
                    value={discForm.ata_code}
                    onChange={(e) => setDiscForm((s) => ({ ...s, ata_code: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Tach time"
                    size="small"
                    value={discForm.tach_time}
                    onChange={(e) => setDiscForm((s) => ({ ...s, tach_time: e.target.value }))}
                    fullWidth
                  />
                </Stack>
                <TextField
                  label="Description"
                  size="small"
                  multiline
                  minRows={3}
                  value={discForm.description}
                  onChange={(e) => setDiscForm((s) => ({ ...s, description: e.target.value }))}
                  fullWidth
                  required
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setReportDiscrepancyOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleCreateDiscrepancy}
                disabled={creatingDisc || loading}
              >
                {creatingDisc ? "Submitting…" : "Submit discrepancy"}
              </Button>
            </DialogActions>
          </Dialog>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                My discrepancy reports
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Issues you reported.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Reported</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>ATA</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myDiscs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography color="text.secondary">None yet.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    myDiscs.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.date_reported || "—"}</TableCell>
                        <TableCell>{d.status || "—"}</TableCell>
                        <TableCell>{d.ata_code || "—"}</TableCell>
                        <TableCell>{d.description || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
