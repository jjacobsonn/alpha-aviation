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
  Grid,
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
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  deleteFlight,
  fetchCompanyFlights,
  patchCompanyFlightDispatch,
  updateFlight,
} from "../shared/Api";
import { formatAircraftRef } from "../shared/aircraftDisplay";
import useDebouncedValue from "../shared/useDebouncedValue";
import {
  DISPATCH_STATUS_FILTERS,
  buildDispatchSuggestions,
  filterDispatchFlights,
} from "../shared/moduleSearch";
import ModuleSearchBar from "../components/search/ModuleSearchBar";
import ScrollableTableContainer from "../components/ScrollableTableContainer";
import TablePaginationBar, { ROWS_PER_PAGE_OPTIONS_5_10_15 } from "../components/TablePaginationBar";
import { useTablePagination } from "../shared/useTablePagination";
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

function clickableRowProps(onActivate) {
  return {
    hover: true,
    onClick: onActivate,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
    tabIndex: 0,
    role: "button",
    sx: { cursor: "pointer" },
  };
}

export default function DispatcherDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAppContext();
  const platformAdmin = isPlatformAdmin(state.user);
  const effectiveRole = state.viewAsUser?.role || state.user?.role;
  const canDeleteFlights = effectiveRole === "owner";
  const hasCompanyContext =
    Boolean(state.user?.companyId) || Boolean(localStorage.getItem("adminCompanyId"));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flights, setFlights] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [busyId, setBusyId] = useState(null);
  const [editingFlight, setEditingFlight] = useState(null);
  const [editForm, setEditForm] = useState({
    flight_number: "",
    origin: "",
    destination: "",
    departure_time: "",
    arrival_time: "",
    status: "",
  });
  const aircraftFilterFromQuery = new URLSearchParams(location.search).get("aircraft") || "";

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

  const dispatchSuggestions = useMemo(
    () => buildDispatchSuggestions(flights, debouncedSearch),
    [flights, debouncedSearch]
  );

  const aircraftFilteredFlights = useMemo(() => {
    if (!aircraftFilterFromQuery) return flights;
    return flights.filter((f) => {
      const aircraftId =
        typeof f?.aircraft === "object" && f?.aircraft != null ? f.aircraft.id : f?.aircraft;
      return String(aircraftId) === String(aircraftFilterFromQuery);
    });
  }, [flights, aircraftFilterFromQuery]);

  const filtered = useMemo(
    () => filterDispatchFlights(aircraftFilteredFlights, debouncedSearch, filter, null),
    [aircraftFilteredFlights, debouncedSearch, filter]
  );

  const flightsPagination = useTablePagination(filtered, {
    pageSize: 10,
    sortById: false,
  });

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

  const openEdit = (flight) => {
    setEditingFlight(flight);
    const toLocal = (iso) => {
      if (!iso) return "";
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`;
    };
    setEditForm({
      flight_number: flight?.flight_number || "",
      origin: flight?.origin || "",
      destination: flight?.destination || "",
      departure_time: toLocal(flight?.departure_time),
      arrival_time: toLocal(flight?.arrival_time),
      status: flight?.status || "pending approval",
    });
  };

  const saveEdit = async () => {
    if (!editingFlight?.id) return;
    setBusyId(editingFlight.id);
    setError("");
    try {
      await updateFlight(editingFlight.id, {
        flight_number: editForm.flight_number || null,
        origin: editForm.origin,
        destination: editForm.destination,
        departure_time: editForm.departure_time ? new Date(editForm.departure_time).toISOString() : null,
        arrival_time: editForm.arrival_time ? new Date(editForm.arrival_time).toISOString() : null,
        status: editForm.status,
      });
      setEditingFlight(null);
      await load();
    } catch (e) {
      setError(e?.message || "Could not save flight updates.");
    } finally {
      setBusyId(null);
    }
  };

  const removeFlight = async (id) => {
    if (!canDeleteFlights) {
      setError("Only owners can delete flights.");
      return;
    }
    setBusyId(id);
    setError("");
    try {
      await deleteFlight(id);
      await load();
    } catch (e) {
      setError(e?.message || "Could not delete flight.");
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
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3 }, minWidth: 0 }}>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Stack spacing={1}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  Dispatcher
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Review flight requests, approve or cancel, and monitor scheduled flights.
                </Typography>
              </Box>
            </Stack>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
          {aircraftFilterFromQuery ? (
            <Stack direction="row">
              <Chip
                color="primary"
                variant="outlined"
                label={`Aircraft filter: ${aircraftFilterFromQuery}`}
                onDelete={() => {
                  const params = new URLSearchParams(location.search);
                  params.delete("aircraft");
                  navigate(
                    {
                      pathname: "/dispatcher-dashboard",
                      search: params.toString() ? `?${params.toString()}` : "",
                    },
                    { replace: true }
                  );
                }}
              />
            </Stack>
          ) : null}

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

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", minWidth: 0 }}>
            <CardContent sx={{ minWidth: 0, p: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Pending requests
              </Typography>
              {loading ? (
                <Typography color="text.secondary">Loading…</Typography>
              ) : pending.length === 0 ? (
                <Typography color="text.secondary">No requests awaiting approval.</Typography>
              ) : (
                <ScrollableTableContainer minWidth={860} fill>
                <Table size="small" sx={{ '& .MuiTableCell-head': { whiteSpace: 'nowrap' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '12%' }}>Status</TableCell>
                      <TableCell sx={{ width: '10%' }}>Flight #</TableCell>
                      <TableCell sx={{ width: '18%' }}>Aircraft</TableCell>
                      <TableCell sx={{ width: '16%' }}>Route</TableCell>
                      <TableCell sx={{ width: '22%' }}>Departure</TableCell>
                      <TableCell align="right" sx={{ width: '22%' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pending.map((f) => (
                      <TableRow
                        key={f.id}
                        {...clickableRowProps(() => openEdit(f))}
                      >
                        <TableCell>{statusChip(f.status)}</TableCell>
                        <TableCell>{f.flight_number || "—"}</TableCell>
                        <TableCell>
                          {f.aircraft_name || formatAircraftRef(f.aircraft) || "—"}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {(f.origin || "—") + " → " + (f.destination || "—")}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDt(f.departure_time)}</TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="nowrap">
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
                </ScrollableTableContainer>
              )}
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", minWidth: 0 }}>
            <CardContent sx={{ minWidth: 0, p: { xs: 2, sm: 3 } }}>
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
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
                  <Button
                    variant="outlined"
                    startIcon={<CalendarMonthIcon />}
                    onClick={() => navigate("/calendar")}
                    sx={{ mt: 0.5 }}
                  >
                    Calendar
                  </Button>
                  <Box sx={{ flex: 1, width: "100%" }}>
                    <ModuleSearchBar
                      value={search}
                      onChange={setSearch}
                      placeholder="Search flight #, route, aircraft, status…"
                      suggestions={dispatchSuggestions}
                      statusOptions={DISPATCH_STATUS_FILTERS}
                      statusValue={filter}
                      onStatusChange={setFilter}
                      statusVariant="toggle"
                      resultCount={filtered.length}
                      totalCount={aircraftFilteredFlights.length}
                    />
                  </Box>
                </Stack>
              </Stack>
              <ScrollableTableContainer minWidth={980} fill>
              <Table size="small" sx={{ '& .MuiTableCell-head': { whiteSpace: 'nowrap' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '10%' }}>Status</TableCell>
                    <TableCell sx={{ width: '9%' }}>Flight #</TableCell>
                    <TableCell sx={{ width: '16%' }}>Aircraft</TableCell>
                    <TableCell sx={{ width: '14%' }}>Route</TableCell>
                    <TableCell sx={{ width: '18%' }}>Departure</TableCell>
                    <TableCell sx={{ width: '18%' }}>Arrival</TableCell>
                    <TableCell align="right" sx={{ width: '15%' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography color="text.secondary">Loading…</Typography>
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography color="text.secondary">No flights match.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    flightsPagination.pagedItems.map((f) => (
                      <TableRow
                        key={f.id}
                        {...clickableRowProps(() => openEdit(f))}
                      >
                        <TableCell>{statusChip(f.status)}</TableCell>
                        <TableCell>{f.flight_number || "—"}</TableCell>
                        <TableCell>
                          {f.aircraft_name || formatAircraftRef(f.aircraft) || "—"}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {(f.origin || "—") + " → " + (f.destination || "—")}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDt(f.departure_time)}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDt(f.arrival_time)}</TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="nowrap">
                            <Button size="small" variant="outlined" onClick={() => openEdit(f)}>
                              Edit
                            </Button>
                            {canDeleteFlights ? (
                              <Button
                                size="small"
                                color="error"
                                onClick={() => removeFlight(f.id)}
                                disabled={busyId === f.id}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </ScrollableTableContainer>
              {!loading && filtered.length > 0 ? (
                <TablePaginationBar
                  page={flightsPagination.page}
                  pageCount={flightsPagination.pageCount}
                  pageSize={flightsPagination.pageSize}
                  total={flightsPagination.total}
                  onPageChange={flightsPagination.setPage}
                  onPageSizeChange={flightsPagination.setPageSize}
                  rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS_5_10_15}
                />
              ) : null}
            </CardContent>
          </Card>
          <Dialog
            open={Boolean(editingFlight)}
            onClose={() => setEditingFlight(null)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>Edit Flight</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  label="Flight #"
                  value={editForm.flight_number}
                  onChange={(e) => setEditForm((s) => ({ ...s, flight_number: e.target.value }))}
                />
                <TextField
                  label="Origin"
                  value={editForm.origin}
                  onChange={(e) => setEditForm((s) => ({ ...s, origin: e.target.value }))}
                />
                <TextField
                  label="Destination"
                  value={editForm.destination}
                  onChange={(e) => setEditForm((s) => ({ ...s, destination: e.target.value }))}
                />
                <TextField
                  label="Departure"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={editForm.departure_time}
                  onChange={(e) => setEditForm((s) => ({ ...s, departure_time: e.target.value }))}
                />
                <TextField
                  label="Arrival"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={editForm.arrival_time}
                  onChange={(e) => setEditForm((s) => ({ ...s, arrival_time: e.target.value }))}
                />
                <TextField
                  select
                  label="Status"
                  value={editForm.status}
                  onChange={(e) => setEditForm((s) => ({ ...s, status: e.target.value }))}
                >
                  <MenuItem value="pending approval">Pending approval</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="delayed">Delayed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </TextField>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditingFlight(null)}>Cancel</Button>
              <Button variant="contained" onClick={saveEdit} disabled={Boolean(busyId)}>
                Save
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </Container>
    </Box>
  );
}
