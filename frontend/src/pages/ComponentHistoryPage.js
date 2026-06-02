import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  LinearProgress,
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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import HistoryIcon from "@mui/icons-material/History";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router";
import ModuleSearchBar from "../components/search/ModuleSearchBar";
import ScrollableTableContainer from "../components/ScrollableTableContainer";
import {
  createTrackedComponent,
  downloadComponentHistoryExport,
  fetchCompanies,
  fetchCompanyAircrafts,
  fetchParts,
  fetchComponentHistoryDetail,
  fetchComponentHistorySearch,
} from "../shared/Api";
import useDebouncedValue from "../shared/useDebouncedValue";
import { useAppContext } from "../context/AppContext";
import { isPlatformAdmin } from "../shared/rbac";

const TYPE_FILTERS = [
  { value: "all", label: "All types" },
  { value: "serialized", label: "Rotables" },
  { value: "consumable", label: "Consumables" },
];

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
  catalog_part_id: "",
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

function StatCard({ title, value, icon, color, loading }) {
  return (
    <Card
      elevation={0}
      sx={{ border: "1px solid", borderColor: "divider", height: "100%" }}
    >
      <CardContent sx={{ py: 2.5 }}>
        <Stack spacing={0.5} alignItems="center" textAlign="center">
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color }}>
            {loading ? "—" : value}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ComponentTimeline({ events }) {
  if (!events?.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No events recorded yet.
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
  const { state } = useAppContext();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("lg"));
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const isCompactHeader = useMediaQuery(theme.breakpoints.down("md"));
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, serialized: 0, consumable: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(
    searchParams.get("id") ? Number(searchParams.get("id")) : null
  );
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [registerBusy, setRegisterBusy] = useState(false);
  const [aircraft, setAircraft] = useState([]);
  const [catalogParts, setCatalogParts] = useState([]);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [all, serialized, consumable] = await Promise.all([
        fetchComponentHistorySearch({ page_size: 1 }),
        fetchComponentHistorySearch({ page_size: 1, component_type: "serialized" }),
        fetchComponentHistorySearch({ page_size: 1, component_type: "consumable" }),
      ]);
      setStats({
        total: all?.count ?? 0,
        serialized: serialized?.count ?? 0,
        consumable: consumable?.count ?? 0,
      });
    } catch {
      setStats({ total: 0, serialized: 0, consumable: 0 });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadSearch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page_size: 25 };
      if (debouncedQuery.trim()) params.q = debouncedQuery.trim();
      if (typeFilter && typeFilter !== "all") params.component_type = typeFilter;
      const data = await fetchComponentHistorySearch(params);
      setResults(Array.isArray(data?.results) ? data.results : []);
      setCount(data?.count ?? 0);
    } catch (e) {
      setError(e?.message || "Could not search components.");
      setResults([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, typeFilter]);

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
    loadStats();
  }, [loadStats, statsRefreshKey]);

  useEffect(() => {
    loadSearch();
  }, [loadSearch]);

  useEffect(() => {
    const params = {};
    if (debouncedQuery.trim()) params.q = debouncedQuery.trim();
    if (typeFilter && typeFilter !== "all") params.type = typeFilter;
    if (selectedId) params.id = String(selectedId);
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, typeFilter, selectedId, setSearchParams]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!isPlatformAdmin(state.user)) return;
    if (localStorage.getItem("adminCompanyId")) return;
    fetchCompanies()
      .then((list) => {
        const companies = Array.isArray(list) ? list : [];
        if (companies.length === 1) {
          localStorage.setItem("adminCompanyId", String(companies[0].id));
        } else {
          const horizon = companies.find((c) =>
            String(c.name || "").toLowerCase().includes("horizon")
          );
          if (horizon?.id) {
            localStorage.setItem("adminCompanyId", String(horizon.id));
          }
        }
        setStatsRefreshKey((k) => k + 1);
      })
      .catch(() => {});
  }, [state.user]);

  useEffect(() => {
    fetchCompanyAircrafts()
      .then((data) => setAircraft(Array.isArray(data) ? data : []))
      .catch(() => setAircraft([]));
  }, [statsRefreshKey]);

  useEffect(() => {
    fetchParts()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCatalogParts(
          list
            .map((p) => ({
              id: p.id,
              part_number: p.part_number || "",
              name: p.name || "",
            }))
            .sort((a, b) => a.part_number.localeCompare(b.part_number))
        );
      })
      .catch(() => setCatalogParts([]));
  }, [statsRefreshKey]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
    if (searchParams.get("register") !== "1") return;
    setRegisterForm({
      ...emptyRegisterForm,
      catalog_part_id: searchParams.get("part_id") || "",
      part_number: searchParams.get("part_number") || "",
      part_name: searchParams.get("part_name") || "",
    });
    setRegisterOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("register");
    next.delete("part_id");
    next.delete("part_number");
    next.delete("part_name");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link once from Parts
  }, []);

  const suggestions = useMemo(() => {
    const seen = new Set();
    results.forEach((row) => {
      if (row.part_number) seen.add(row.part_number);
      if (row.serial_number) seen.add(row.serial_number);
      if (row.part_name) seen.add(row.part_name);
    });
    return [...seen].slice(0, 24);
  }, [results]);

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
      if (!registerForm.catalog_part_id) {
        setError("Select a part from your Parts inventory catalog.");
        setRegisterBusy(false);
        return;
      }
      payload.part_id = Number(registerForm.catalog_part_id);
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
      setStatsRefreshKey((k) => k + 1);
      await loadSearch();
      if (created?.id) {
        setSelectedId(created.id);
      }
    } catch (e) {
      const msg =
        e?.data &&
        typeof e.data === "object" &&
        !Array.isArray(e.data)
          ? Object.entries(e.data)
              .flatMap(([k, v]) =>
                Array.isArray(v) ? v.map((x) => `${k}: ${x}`) : [`${k}: ${v}`]
              )
              .join(" ")
          : "";
      setError(msg || e?.data?.error || e?.message || "Could not register component.");
    } finally {
      setRegisterBusy(false);
    }
  };

  const header = detail || results.find((r) => r.id === selectedId);
  const showEmpty = !loading && results.length === 0;
  const selectedCatalogPart = useMemo(
    () =>
      catalogParts.find((p) => String(p.id) === String(registerForm.catalog_part_id)) ||
      null,
    [catalogParts, registerForm.catalog_part_id]
  );

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Container
        maxWidth="xl"
        sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3 }, minWidth: 0 }}
      >
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
            sx={{ width: "100%" }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              sx={{ minWidth: 0, flex: 1 }}
            >
              <HistoryIcon
                color="primary"
                sx={{ fontSize: { xs: 28, sm: 32 }, flexShrink: 0, mt: 0.25 }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "1.35rem", sm: "2rem" },
                    lineHeight: 1.2,
                  }}
                >
                  Component History
                </Typography>
                <Stack spacing={1} sx={{ mt: 0.5 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ wordBreak: "break-word" }}
                  >
                    Track installation and removal history for serialized components from your{" "}
                    <RouterLink to="/parts">Parts Inventory</RouterLink>. Add the part to
                    inventory first, then register its serial number here.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                    Calibrated shop tools are managed under{" "}
                    <RouterLink to="/parts?tab=tools">Parts → Calibration</RouterLink>.
                  </Typography>
                </Stack>
              </Box>
            </Stack>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              useFlexGap
              sx={{
                width: { xs: "100%", md: "auto" },
                flexShrink: 0,
              }}
            >
              <Button
                variant="outlined"
                component={RouterLink}
                to="/parts"
                fullWidth={isPhone}
                sx={{
                  minHeight: 44,
                  whiteSpace: "nowrap",
                  width: { xs: "100%", sm: "auto" },
                  flex: { sm: "1 1 0", md: "0 0 auto" },
                  minWidth: { sm: 0 },
                  px: { xs: 2, sm: 2.5 },
                }}
              >
                {isCompactHeader ? "Parts" : "Parts catalog"}
              </Button>
              <Button
                variant="contained"
                startIcon={isPhone ? undefined : <AddIcon />}
                onClick={() => setRegisterOpen(true)}
                fullWidth={isPhone}
                sx={{
                  minHeight: 44,
                  whiteSpace: "nowrap",
                  width: { xs: "100%", sm: "auto" },
                  flex: { sm: "1 1 0", md: "0 0 auto" },
                  minWidth: { sm: 0 },
                  px: { xs: 2, sm: 2.5 },
                }}
              >
                {isCompactHeader ? "Register" : "Register component"}
              </Button>
            </Stack>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Tracked components"
                value={stats.total}
                loading={statsLoading}
                color="primary.main"
                icon={<PrecisionManufacturingIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Rotables"
                value={stats.serialized}
                loading={statsLoading}
                color="info.main"
                icon={<CategoryOutlinedIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Consumables"
                value={stats.consumable}
                loading={statsLoading}
                color="success.main"
                icon={<Inventory2OutlinedIcon />}
              />
            </Grid>
          </Grid>

          {error ? (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          ) : null}

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent sx={{ py: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
              <ModuleSearchBar
                value={query}
                onChange={setQuery}
                placeholder="Part number, serial, name, tail, or location…"
                suggestions={suggestions}
                statusOptions={TYPE_FILTERS}
                statusValue={typeFilter}
                onStatusChange={setTypeFilter}
                statusVariant="chips"
                resultCount={count}
                totalCount={stats.total}
              />
            </CardContent>
          </Card>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: selectedId && !isCompact ? "minmax(300px, 1fr) minmax(360px, 1.35fr)" : "1fr",
              },
              gap: 2,
              alignItems: "start",
            }}
          >
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", minWidth: 0 }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Tracked components
                  </Typography>
                  {loading ? (
                    <Typography variant="caption" color="text.secondary">
                      Loading…
                    </Typography>
                  ) : null}
                </Stack>

                {loading && !results.length ? (
                  <Stack alignItems="center" py={5}>
                    <CircularProgress size={32} />
                  </Stack>
                ) : showEmpty ? (
                  <Stack alignItems="center" spacing={2} sx={{ py: { xs: 4, sm: 6 }, px: 2 }}>
                    <PrecisionManufacturingIcon sx={{ fontSize: 48, color: "action.disabled" }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {debouncedQuery.trim() || typeFilter !== "all"
                        ? "No matching components"
                        : "No tracked components yet"}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      textAlign="center"
                      sx={{ maxWidth: 400 }}
                    >
                      {debouncedQuery.trim() || typeFilter !== "all"
                        ? "Adjust your search or filters, or register a new component."
                        : "Register rotables by serial number or consumables by part number to build compliance timelines."}
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setRegisterOpen(true)}
                    >
                      Register component
                    </Button>
                  </Stack>
                ) : (
                  <ScrollableTableContainer minWidth={640} fill>
                    <Table
                      size="small"
                      sx={{
                        "& .MuiTableCell-head": {
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          bgcolor: "action.hover",
                        },
                        "& .MuiTableCell-root": {
                          wordBreak: "break-word",
                        },
                      }}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: "22%" }}>Part number</TableCell>
                          <TableCell sx={{ width: "16%" }}>Serial #</TableCell>
                          <TableCell sx={{ width: "12%" }}>Type</TableCell>
                          <TableCell sx={{ width: "42%" }}>Aircraft / location</TableCell>
                          <TableCell align="right" sx={{ width: "8%" }}>
                            Events
                          </TableCell>
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
                              <Stack spacing={0.25}>
                                <span>{row.part_number}</span>
                                {!row.part ? (
                                  <Typography variant="caption" color="warning.main">
                                    Not linked to catalog
                                  </Typography>
                                ) : null}
                              </Stack>
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
              <Card
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  minWidth: 0,
                  boxShadow: (t) => `inset 3px 0 0 ${t.palette.primary.main}`,
                }}
              >
                <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
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
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="overline" color="text.secondary">
                            Component detail
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800 }}>
                            {header.part_name || header.part_number}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            P/N {header.part_number}
                            {header.serial_number ? ` · S/N ${header.serial_number}` : ""}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                            <Chip
                              size="small"
                              label={
                                header.component_type === "serialized" ? "Rotable" : "Consumable"
                              }
                              variant="outlined"
                            />
                            {header.part ? (
                              <Chip
                                size="small"
                                label="In Parts catalog"
                                color="success"
                                variant="outlined"
                                component={RouterLink}
                                to="/parts"
                                clickable
                              />
                            ) : (
                              <Chip
                                size="small"
                                label="Not linked to catalog"
                                color="warning"
                                variant="outlined"
                              />
                            )}
                            <Chip
                              size="small"
                              label={
                                header.aircraft_label
                                  ? header.aircraft_label
                                  : header.location || "No location"
                              }
                              variant="outlined"
                            />
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ alignSelf: "flex-start", flexShrink: 0 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setSelectedId(null)}
                          >
                            Close
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={handleExport}
                            disabled={exporting}
                          >
                            Export CSV
                          </Button>
                        </Stack>
                      </Stack>

                      <LifeLimitSummary component={header} />

                      <Divider />

                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Timeline
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

      <Dialog
        open={registerOpen}
        onClose={() => !registerBusy && setRegisterOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Register component</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {catalogParts.length === 0 ? (
              <Alert severity="warning">
                No parts in your inventory catalog yet. Add parts on{" "}
                <RouterLink to="/parts">Parts → Inventory</RouterLink> first, then register a
                tracked unit here.
              </Alert>
            ) : null}
            <Autocomplete
              options={catalogParts}
              getOptionLabel={(opt) =>
                opt?.part_number ? `${opt.part_number} — ${opt.name || "Unnamed"}` : ""
              }
              value={selectedCatalogPart}
              onChange={(_, opt) =>
                setRegisterForm((s) => ({
                  ...s,
                  catalog_part_id: opt ? String(opt.id) : "",
                  part_number: opt?.part_number || "",
                  part_name: opt?.name || "",
                }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Part from inventory catalog"
                  placeholder="Required — choose a part number from Parts"
                  helperText="Must match a part on Parts → Inventory"
                />
              )}
            />
            <TextField
              label="Part number"
              required
              value={registerForm.part_number}
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Part name"
              value={registerForm.part_name}
              fullWidth
              InputProps={{ readOnly: true }}
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
              label="Rotable (serialized)"
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
              label="Aircraft"
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
              placeholder="Hangar, shop stock, etc."
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
              label="Install date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={registerForm.installed_at}
              onChange={(e) => setRegisterForm((s) => ({ ...s, installed_at: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Initial note"
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
            disabled={registerBusy || !registerForm.catalog_part_id || catalogParts.length === 0}
            onClick={handleRegister}
          >
            {registerBusy ? "Saving…" : "Register"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
