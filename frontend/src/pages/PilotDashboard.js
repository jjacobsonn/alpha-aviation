import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  Grid,
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

  const [flightForm, setFlightForm] = useState({
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
  });

  const [discForm, setDiscForm] = useState({
    aircraft: "",
    ata_code: "",
    tach_time: "",
    description: "",
  });

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
        const pid = Number(f?.primary_pilot);
        const sid = Number(f?.secondary_pilot);
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
      setFlightForm((s) => ({
        ...s,
        flight_number: "",
        origin: "",
        destination: "",
        route: "",
        secondary_pilot: "",
      }));
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
      setDiscForm({ aircraft: "", ata_code: "", tach_time: "", description: "" });
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
    if (Number(f?.primary_pilot) === uid) return "Primary";
    if (Number(f?.secondary_pilot) === uid) return "Secondary";
    return "—";
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
            <Typography variant="body2" color="text.secondary">
              Flights and aircraft use your company in the database (same tenant as Organizations
              and users). The table shows real flight rows where you are primary or secondary
              pilot—not UI placeholders.
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
                My flights
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Rows are{" "}
                <Typography component="span" variant="caption" fontWeight={600}>
                  Flight
                </Typography>{" "}
                records returned from the backend for your company (e.g. created in Site Admin or
                after a dispatcher approves a request).
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
                      <TableRow key={f.id}>
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

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Request a flight
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Submits a request for dispatch or management to approve.
              </Typography>
              <Stack spacing={2}>
                <Typography variant="caption" color="text.secondary">
                  Aircraft list is loaded from your company&apos;s fleet ({aircraft.length} tail
                  {aircraft.length === 1 ? "" : "s"}).
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel id="pilot-req-aircraft-label">Aircraft</InputLabel>
                  <Select
                    labelId="pilot-req-aircraft-label"
                    label="Aircraft"
                    value={flightForm.aircraft}
                    onChange={(e) => setFlightForm((s) => ({ ...s, aircraft: e.target.value }))}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Choose aircraft</em>
                    </MenuItem>
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
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="pilot-req-ftype-label">Flight type</InputLabel>
                    <Select
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
                </Stack>
                <FormControl fullWidth size="small">
                  <InputLabel id="pilot-req-sec-label">Secondary pilot (optional)</InputLabel>
                  <Select
                    labelId="pilot-req-sec-label"
                    label="Secondary pilot (optional)"
                    value={flightForm.secondary_pilot}
                    onChange={(e) => setFlightForm((s) => ({ ...s, secondary_pilot: e.target.value }))}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {pilots.map((p) => (
                      <MenuItem key={p.id} value={String(p.id)}>
                        {p.first_name} {p.last_name} ({p.username})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={handleSubmitFlightRequest}
                    disabled={submittingFlight || loading}
                  >
                    {submittingFlight ? "Submitting…" : "Submit request"}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Report a discrepancy
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Creates a real{" "}
                <Typography component="span" fontWeight={600}>
                  Discrepancy
                </Typography>{" "}
                record via the API (visible to maintenance). Use the same fleet list as above.
              </Typography>
              <Stack spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel id="pilot-disc-aircraft-label">Aircraft</InputLabel>
                  <Select
                    labelId="pilot-disc-aircraft-label"
                    label="Aircraft"
                    value={discForm.aircraft}
                    onChange={(e) => setDiscForm((s) => ({ ...s, aircraft: e.target.value }))}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Select aircraft</em>
                    </MenuItem>
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
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={handleCreateDiscrepancy}
                    disabled={creatingDisc || loading}
                  >
                    {creatingDisc ? "Submitting…" : "Submit discrepancy"}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                My discrepancy reports
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Pulled from the API for discrepancies you reported. Empty until you submit at
                least one.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
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
                        <TableCell>{d.id}</TableCell>
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
