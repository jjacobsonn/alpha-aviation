import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchCompanyFlights,
  patchCompanyFlightDispatch,
} from "../shared/Api";
import { useAppContext } from "../context/AppContext";
import { isPlatformAdmin } from "../shared/rbac";

function statusChip(status) {
  const s = status || "";
  if (s === "approved" || s === "scheduled") return <Chip size="small" color="success" label={s} />;
  if (s === "pending approval") return <Chip size="small" color="warning" label="Pending approval" />;
  if (s === "completed") return <Chip size="small" variant="outlined" label="Completed" />;
  if (s === "cancelled") return <Chip size="small" color="default" label="Cancelled" />;
  if (s === "delayed") return <Chip size="small" color="error" label="Delayed" />;
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

export default function DispatcherDashboard() {
  const { state } = useAppContext();
  const platformAdmin = isPlatformAdmin(state.user);
  const hasCompanyContext =
    Boolean(state.user?.companyId) || Boolean(localStorage.getItem("adminCompanyId"));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flights, setFlights] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (platformAdmin && !hasCompanyContext) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchCompanyFlights();
      setFlights(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load flights.");
    } finally {
      setLoading(false);
    }
  }, [platformAdmin, hasCompanyContext]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = useMemo(
    () => flights.filter((f) => f?.status === "pending approval"),
    [flights]
  );

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const endOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []);

  const todayCount = useMemo(() => {
    return flights.filter((f) => {
      const t = f?.departure_time ? new Date(f.departure_time).getTime() : 0;
      return t >= startOfToday && t <= endOfToday && f?.status !== "cancelled";
    }).length;
  }, [flights, startOfToday, endOfToday]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = flights;
    if (filter === "pending") list = list.filter((f) => f?.status === "pending approval");
    else if (filter === "approved")
      list = list.filter((f) => f?.status === "approved" || f?.status === "scheduled");
    else if (filter === "completed") list = list.filter((f) => f?.status === "completed");
    if (!q) return list;
    return list.filter((f) => {
      const blob = [
        f.flight_number,
        f.origin,
        f.destination,
        f.aircraft_name,
        f.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [flights, search, filter]);

  const handleApprove = async (id) => {
    setBusyId(id);
    setError("");
    try {
      await patchCompanyFlightDispatch(id, { status: "approved" });
      await load();
    } catch (e) {
      setError(e?.message || "Could not approve flight.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    setBusyId(id);
    setError("");
    try {
      await patchCompanyFlightDispatch(id, { status: "cancelled" });
      await load();
    } catch (e) {
      setError(e?.message || "Could not update flight.");
    } finally {
      setBusyId(null);
    }
  };

  if (platformAdmin && !hasCompanyContext) {
    return (
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh", py: 4 }}>
        <Container maxWidth="lg">
          <Alert severity="info">
            Select a company under Organizations to use the dispatcher dashboard as that tenant.
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
              Dispatch
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review flight requests, approve or cancel, and monitor scheduled flights.
            </Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <PendingActionsIcon color="warning" />
                    <Typography variant="body2" color="text.secondary">
                      Pending approval
                    </Typography>
                  </Stack>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {loading ? "—" : pending.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <CalendarMonthIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Departing today
                    </Typography>
                  </Stack>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {loading ? "—" : todayCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <EventAvailableIcon color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Total flights (company)
                    </Typography>
                  </Stack>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {loading ? "—" : flights.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Pending requests
              </Typography>
              {loading ? (
                <Typography color="text.secondary">Loading…</Typography>
              ) : pending.length === 0 ? (
                <Typography color="text.secondary">No requests awaiting approval.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Flight #</TableCell>
                      <TableCell>Aircraft</TableCell>
                      <TableCell>Route</TableCell>
                      <TableCell>Departure</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pending.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>{statusChip(f.status)}</TableCell>
                        <TableCell>{f.flight_number || "—"}</TableCell>
                        <TableCell>{f.aircraft_name || f.aircraft || "—"}</TableCell>
                        <TableCell>
                          {(f.origin || "—") + " → " + (f.destination || "—")}
                        </TableCell>
                        <TableCell>{formatDt(f.departure_time)}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              disabled={busyId === f.id}
                              onClick={() => handleApprove(f.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="inherit"
                              disabled={busyId === f.id}
                              onClick={() => handleReject(f.id)}
                            >
                              Reject
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ md: "center" }}
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  All flights
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                  <TextField
                    size="small"
                    placeholder="Search flight #, route, status…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ minWidth: 260 }}
                  />
                  <ToggleButtonGroup
                    size="small"
                    value={filter}
                    exclusive
                    onChange={(_, v) => v != null && setFilter(v)}
                  >
                    <ToggleButton value="all">All</ToggleButton>
                    <ToggleButton value="pending">Pending</ToggleButton>
                    <ToggleButton value="approved">Approved</ToggleButton>
                    <ToggleButton value="completed">Completed</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Flight #</TableCell>
                    <TableCell>Aircraft</TableCell>
                    <TableCell>Route</TableCell>
                    <TableCell>Departure</TableCell>
                    <TableCell>Arrival</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography color="text.secondary">Loading…</Typography>
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography color="text.secondary">No flights match.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>{statusChip(f.status)}</TableCell>
                        <TableCell>{f.flight_number || "—"}</TableCell>
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
        </Stack>
      </Container>
    </Box>
  );
}
