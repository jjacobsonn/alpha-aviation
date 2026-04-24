import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { fetchCompanyDiscrepancies, fetchCompanyFlights, fetchCompanyWorkorders } from "../shared/Api";
import { useAppContext } from "../context/AppContext";
import { isPlatformAdmin } from "../shared/rbac";
import AddEventModal from "../components/calendar/AddEventModal";
import EventDetailsPanel from "../components/calendar/EventDetailsPanel";
import CalendarEventCard from "../components/calendar/CalendarEventCard";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_ROW_HEIGHT = 56;
const START_HOUR = 0;
const END_HOUR = 24;
const WEEK_GRID_MIN_WIDTH = 980;
const EVENT_KIND_OPTIONS = ["flight", "workorder", "discrepancy", "other"];

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

function parseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function humanDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function eventPalette(kind) {
  if (kind === "flight") {
    return {
      border: "#2f5be7",
      background: "#e7eeff",
      text: "#12308c",
    };
  }
  if (kind === "workorder") {
    return {
      border: "#ef6c00",
      background: "#fff2e8",
      text: "#8d4200",
    };
  }
  if (kind === "discrepancy") {
    return {
      border: "#d14343",
      background: "#fdecec",
      text: "#8c1f1f",
    };
  }
  if (kind === "other") {
    return {
      border: "#7b4dce",
      background: "#f2ecff",
      text: "#4b2a87",
    };
  }
  return {
    border: "#4b5563",
    background: "#f4f5f7",
    text: "#1f2937",
  };
}

// Backward-compatible helper for HMR refresh edge-cases.
// Some hot-update chunks may still call eventChip during fast refresh.
function eventChip(event, onClick) {
  return (
    <CalendarEventCard
      event={event}
      palette={eventPalette(event?.kind)}
      variant="chip"
      onClick={onClick}
    />
  );
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function minutesSinceDayStart(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatTimeRange(start, end) {
  const opts = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleTimeString([], opts)} - ${end.toLocaleTimeString([], opts)}`;
}

function kindLabel(kind) {
  if (kind === "flight") return "Flight";
  if (kind === "workorder") return "Work Order";
  if (kind === "discrepancy") return "Discrepancy";
  if (kind === "other") return "Other";
  return "Event";
}

function dateInputValue(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDayLayout(events) {
  const timed = events
    .filter((e) => !e.allDay)
    .slice()
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const allDay = events.filter((e) => e.allDay);
  const activeCols = [];
  const placed = [];
  const clusters = [];
  let currentCluster = null;

  timed.forEach((event) => {
    for (let i = activeCols.length - 1; i >= 0; i -= 1) {
      if (activeCols[i].end <= event.start) activeCols.splice(i, 1);
    }

    const occupied = new Set(activeCols.map((x) => x.col));
    let col = 0;
    while (occupied.has(col)) col += 1;

    activeCols.push({ col, end: event.end });
    const node = { ...event, col, overlapCount: 1 };
    placed.push(node);

    if (!currentCluster || event.start >= currentCluster.end) {
      currentCluster = { start: event.start, end: event.end, items: [node] };
      clusters.push(currentCluster);
    } else {
      currentCluster.end = new Date(Math.max(currentCluster.end.getTime(), event.end.getTime()));
      currentCluster.items.push(node);
    }
  });

  clusters.forEach((cluster) => {
    const cols = Math.max(...cluster.items.map((i) => i.col), 0) + 1;
    cluster.items.forEach((item) => {
      item.overlapCount = cols;
    });
  });

  return { timed: placed, allDay };
}

export default function CalendarPage() {
  const { state } = useAppContext();
  const platformAdmin = isPlatformAdmin(state.user);
  const effectiveRole = state.viewAsUser?.role || state.user?.role;
  const canDeleteCalendarEvent = effectiveRole === "owner";
  const hasCompanyContext =
    Boolean(state.user?.companyId) || Boolean(localStorage.getItem("adminCompanyId"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("month");
  const [cursorDate, setCursorDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [visibleKinds, setVisibleKinds] = useState(EVENT_KIND_OPTIONS);
  const [customEvents, setCustomEvents] = useState([]);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [eventDraft, setEventDraft] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [flights, setFlights] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);

  const aircraftOptions = useMemo(() => {
    const unique = new Set(
      flights
        .map((f) => f?.aircraft_name || "")
        .filter(Boolean)
    );
    return Array.from(unique).sort();
  }, [flights]);

  const load = useCallback(async () => {
    if (platformAdmin && !hasCompanyContext) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [f, wo, d] = await Promise.all([
        fetchCompanyFlights(),
        fetchCompanyWorkorders(),
        fetchCompanyDiscrepancies(),
      ]);
      setFlights(Array.isArray(f) ? f : []);
      setWorkOrders(Array.isArray(wo) ? wo : []);
      setDiscrepancies(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(e?.message || "Failed to load calendar data.");
    } finally {
      setLoading(false);
    }
  }, [platformAdmin, hasCompanyContext]);

  useEffect(() => {
    load();
  }, [load]);

  const eventsByDay = useMemo(() => {
    const out = new Map();
    const push = (key, event) => {
      if (!out.has(key)) out.set(key, []);
      out.get(key).push(event);
    };

    flights.forEach((f) => {
      const departure = parseDate(
        f?.departure_time || f?.scheduled_departure || f?.start_time || f?.requested_departure
      );
      if (!departure) return;
      const arrival =
        parseDate(f?.arrival_time || f?.scheduled_arrival || f?.end_time || f?.requested_arrival) ||
        new Date(departure.getTime() + 60 * 60 * 1000);
      push(dateKey(departure), {
        id: `flight-${f.id}`,
        source: "flight",
        kind: "flight",
        title: `${f.flight_number || "Flight"} • ${f.origin || "—"}→${f.destination || "—"}`,
        start: departure,
        end: arrival > departure ? arrival : new Date(departure.getTime() + 45 * 60 * 1000),
        allDay: false,
        route: `${f.origin || "—"} -> ${f.destination || "—"}`,
        aircraft: f.aircraft_name || "",
        status: f.status || "",
        notes: f.notes || "",
        editable: false,
        typeLabel: "Flight",
        timeLabel: formatTimeRange(
          departure,
          arrival > departure ? arrival : new Date(departure.getTime() + 45 * 60 * 1000)
        ),
        subtitle: f.aircraft_name || "Aircraft TBD",
      });
    });

    workOrders.forEach((wo) => {
      const dt = parseDate(wo?.due_by || wo?.due_date || wo?.target_date || wo?.created_at || wo?.updated_at);
      if (!dt || String(wo?.status || "").toLowerCase() === "closed") return;
      push(dateKey(dt), {
        id: `workorder-${wo.id}`,
        source: "workorder",
        kind: "workorder",
        title: `WO #${wo.id} ${wo.title || ""}`.trim(),
        start: startOfDay(dt),
        end: startOfDay(dt),
        allDay: true,
        status: wo.status || "open",
        notes: wo.description || wo.notes || "",
        workRef: `WO #${wo.id}`,
        editable: false,
        typeLabel: "Work Order",
        timeLabel: "All day",
        subtitle: `Status: ${wo.status || "open"}`,
      });
    });

    discrepancies.forEach((disc) => {
      const dt = parseDate(
        disc?.date_reported || disc?.reported_at || disc?.created_at || disc?.updated_at
      );
      if (!dt || String(disc?.status || "").toLowerCase() === "closed") return;
      push(dateKey(dt), {
        id: `discrepancy-${disc.id}`,
        source: "discrepancy",
        kind: "discrepancy",
        title: `Discrepancy #${disc.id}`,
        start: startOfDay(dt),
        end: startOfDay(dt),
        allDay: true,
        status: disc.status || "open",
        notes: disc.description || "",
        workRef: disc?.ata ? `ATA ${disc.ata}` : `Discrepancy #${disc.id}`,
        editable: false,
        typeLabel: "Discrepancy",
        timeLabel: "All day",
        subtitle: disc.ata || "Open issue",
      });
    });

    customEvents.forEach((evt) => {
      if (!evt?.start) return;
      const key = dateKey(new Date(evt.start));
      push(key, {
        ...evt,
        typeLabel: kindLabel(evt.kind),
        timeLabel: formatTimeRange(new Date(evt.start), new Date(evt.end)),
      });
    });

    return out;
  }, [flights, workOrders, discrepancies, customEvents]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(cursorDate);
    const end = endOfMonth(cursorDate);
    const firstCell = addDays(start, -start.getDay());
    const lastCell = addDays(end, 6 - end.getDay());
    const days = [];
    for (let d = new Date(firstCell); d <= lastCell; d = addDays(d, 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [cursorDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursorDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursorDate]);

  const dayEvents = useMemo(() => {
    return eventsByDay.get(dateKey(cursorDate)) || [];
  }, [eventsByDay, cursorDate]);

  const isKindVisible = (kind) => visibleKinds.includes(kind);
  const filterByVisibleKinds = (events) => events.filter((evt) => isKindVisible(evt.kind));
  const toggleKind = (kind) => {
    setVisibleKinds((prev) => {
      if (prev.includes(kind)) return prev.filter((k) => k !== kind);
      return [...prev, kind];
    });
  };

  const title = useMemo(() => {
    if (view === "month") return cursorDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (view === "week") {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${humanDate(start)} - ${humanDate(end)}`;
    }
    return cursorDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [cursorDate, view, weekDays]);

  const moveCursor = (dir) => {
    const next = new Date(cursorDate);
    if (view === "month") next.setMonth(next.getMonth() + dir);
    else next.setDate(next.getDate() + (view === "week" ? 7 * dir : dir));
    setCursorDate(next);
  };

  const openAddEvent = ({ date, minutes = 9 * 60, endMinutes } = {}) => {
    const base = date ? new Date(date) : new Date(cursorDate);
    const start = new Date(base);
    start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    const end = new Date(base);
    const endMins = endMinutes != null ? endMinutes : Math.min(minutes + 60, 23 * 60 + 59);
    end.setHours(Math.floor(endMins / 60), endMins % 60, 0, 0);
    setEditingEventId(null);
    setEventDraft({ kind: "flight", start, end, date: dateInputValue(base) });
    setAddEventOpen(true);
  };

  const minuteFromClick = (event, rowHeight = HOUR_ROW_HEIGHT) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const minutes = Math.floor((y / rowHeight) * 60);
    return Math.max(0, Math.min(23 * 60 + 30, Math.round(minutes / 30) * 30));
  };

  const saveCustomEvent = (payload) => {
    const built = {
      id: editingEventId || `custom-${Date.now()}`,
      source: "custom",
      kind: payload.eventType,
      title: payload.title,
      start: payload.start,
      end: payload.end,
      allDay: false,
      aircraft: payload.aircraft,
      route: payload.route,
      notes: payload.notes,
      status: payload.status,
      editable: true,
    };
    setCustomEvents((prev) => {
      const next = prev.filter((e) => e.id !== built.id);
      return [...next, built];
    });
    setAddEventOpen(false);
    setEventDraft(null);
    setEditingEventId(null);
  };

  const openEditEvent = (event) => {
    if (!event?.editable) return;
    setEditingEventId(event.id);
    setEventDraft(event);
    setAddEventOpen(true);
    setSelectedEvent(null);
  };

  const removeEvent = (event) => {
    if (!event?.editable || !canDeleteCalendarEvent) return;
    setCustomEvents((prev) => prev.filter((e) => e.id !== event.id));
    setSelectedEvent(null);
  };

  if (platformAdmin && !hasCompanyContext) {
    return (
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh", py: 4 }}>
        <Container maxWidth="lg">
          <Alert severity="info">Select a company first to load dispatch calendar.</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Calendar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Time-based scheduling with flight blocks, maintenance, and discrepancies.
            </Typography>
          </Box>

          <Card
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              boxShadow: "0 1px 3px rgba(16,24,40,.08)",
              overflow: "hidden",
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Stack spacing={0.75} sx={{ mb: 1.25 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
                    columnGap: 2,
                    rowGap: 0.75,
                    alignItems: "start",
                  }}
                >
                  <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                      {title}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{
                        p: 0.35,
                        borderRadius: 999,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        width: "fit-content",
                      }}
                    >
                      <Button
                        variant="text"
                        onClick={() => moveCursor(-1)}
                        sx={{ borderRadius: 999, minWidth: 58, fontWeight: 700, color: "text.secondary" }}
                      >
                        Prev
                      </Button>
                      <Button
                        variant="contained"
                        disableElevation
                        onClick={() => setCursorDate(new Date())}
                        sx={{ borderRadius: 999, minWidth: 68, fontWeight: 700 }}
                      >
                        Today
                      </Button>
                      <Button
                        variant="text"
                        onClick={() => moveCursor(1)}
                        sx={{ borderRadius: 999, minWidth: 58, fontWeight: 700, color: "text.secondary" }}
                      >
                        Next
                      </Button>
                    </Stack>
                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" sx={{ opacity: 0.9 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mr: 0.25, opacity: 0.9 }}>
                        Legend:
                      </Typography>
                      {EVENT_KIND_OPTIONS.map((kind) => {
                        const p = eventPalette(kind);
                        const selected = isKindVisible(kind);
                        return (
                          <Chip
                            key={kind}
                            label={kindLabel(kind)}
                            size="small"
                            clickable
                            onClick={() => toggleKind(kind)}
                            variant={selected ? "filled" : "outlined"}
                            sx={{
                              fontWeight: 700,
                              border: "1px solid",
                              borderColor: p.border,
                              bgcolor: selected ? p.background : "transparent",
                              color: selected ? p.text : "text.secondary",
                              opacity: selected ? 1 : 0.75,
                            }}
                          />
                        );
                      })}
                    </Stack>
                  </Stack>

                  <Stack spacing={0.75} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                    <Button
                      variant="contained"
                      onClick={() => openAddEvent({ date: cursorDate })}
                      sx={{ borderRadius: 999, minWidth: 98, fontWeight: 700, flexShrink: 0 }}
                    >
                      Add Event
                    </Button>
                    <ToggleButtonGroup
                      value={view}
                      exclusive
                      onChange={(_, v) => v && setView(v)}
                      sx={{
                        flexShrink: 0,
                        "& .MuiToggleButton-root": {
                          textTransform: "uppercase",
                          fontWeight: 800,
                          letterSpacing: 0.2,
                          px: 2.1,
                          py: 0.75,
                          minHeight: 40,
                          fontSize: "0.82rem",
                        },
                        "& .MuiToggleButton-root.Mui-selected": {
                          bgcolor: "action.selected",
                          color: "text.primary",
                        },
                      }}
                    >
                      <ToggleButton value="day">Day</ToggleButton>
                      <ToggleButton value="week">Week</ToggleButton>
                      <ToggleButton value="month">Month</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>
                </Box>
              </Stack>

              {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
              {loading ? <Typography color="text.secondary">Loading…</Typography> : null}

              {!loading && view === "month" ? (
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                    }}
                  >
                    {WEEKDAY_LABELS.map((w) => (
                      <Box key={`head-${w}`} sx={{ px: 1, py: 0.75, borderRight: "1px solid", borderColor: "divider", "&:last-of-type": { borderRight: "none" } }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>
                          {w}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                    }}
                  >
                    {monthDays.map((d) => {
                      const key = dateKey(d);
                      const isCurrentMonth = d.getMonth() === cursorDate.getMonth();
                      const isToday = dateKey(d) === dateKey(new Date());
                      const events = filterByVisibleKinds(eventsByDay.get(key) || []);
                      return (
                        <Box
                          key={key}
                          onClick={() => openAddEvent({ date: d, minutes: 9 * 60 })}
                          sx={{
                            height: 156,
                            minWidth: 0,
                            p: 0.75,
                            borderRight: "1px solid",
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            bgcolor: isCurrentMonth ? "background.paper" : "action.hover",
                            display: "flex",
                            flexDirection: "column",
                            "&:nth-of-type(7n)": { borderRight: "none" },
                          }}
                        >
                          <Typography
                            variant="caption"
                            color={isCurrentMonth ? "text.primary" : "text.secondary"}
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              fontWeight: 700,
                              bgcolor: isToday ? "primary.main" : "transparent",
                              color: isToday ? "primary.contrastText" : undefined,
                              mb: 0.5,
                              flexShrink: 0,
                            }}
                          >
                            {d.getDate()}
                          </Typography>
                          <Stack spacing={0.75} sx={{ minHeight: 0, overflowY: "auto", pr: 0.25 }}>
                            {events.map((e, idx) => (
                              <Box key={`${key}-${idx}`}>
                                {eventChip(e, setSelectedEvent)}
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              ) : null}

              {!loading && view === "week" ? (
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                  <Box sx={{ overflowX: "auto" }}>
                    <Box sx={{ minWidth: { xs: WEEK_GRID_MIN_WIDTH, md: "100%" } }}>
                      <Box
                        sx={{
                          height: { xs: "58vh", sm: "62vh", md: "66vh" },
                          minHeight: 420,
                          maxHeight: 760,
                          overflowY: "auto",
                        }}
                      >
                        <Box
                          sx={{
                            position: "sticky",
                            top: 0,
                            zIndex: 4,
                            display: "grid",
                            gridTemplateColumns: "72px repeat(7, minmax(120px, 1fr))",
                            bgcolor: "background.paper",
                            borderBottom: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Box sx={{ position: "sticky", left: 0, zIndex: 5, bgcolor: "background.paper" }} />
                          {weekDays.map((d) => {
                            const isToday = dateKey(d) === dateKey(new Date());
                            return (
                              <Box key={`week-head-${dateKey(d)}`} sx={{ p: 1.25, borderLeft: "1px solid", borderColor: "divider" }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                  {WEEKDAY_LABELS[d.getDay()]}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: isToday ? "primary.main" : "text.primary" }}>
                                  {humanDate(d)}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                        <Box sx={{ display: "grid", gridTemplateColumns: "72px repeat(7, minmax(120px, 1fr))", minHeight: HOUR_ROW_HEIGHT * (END_HOUR - START_HOUR) }}>
                          <Box
                            sx={{
                              position: "sticky",
                              left: 0,
                              zIndex: 3,
                              borderRight: "1px solid",
                              borderColor: "divider",
                              bgcolor: "background.paper",
                            }}
                          >
                            <Box sx={{ position: "relative", minHeight: HOUR_ROW_HEIGHT * (END_HOUR - START_HOUR) }}>
                              {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
                                <Typography
                                  key={`time-${i}`}
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ position: "absolute", top: i === 0 ? 4 : i * HOUR_ROW_HEIGHT - 8, right: 8 }}
                                >
                                  {`${String((i + START_HOUR) % 24).padStart(2, "0")}:00`}
                                </Typography>
                              ))}
                            </Box>
                          </Box>
                          {weekDays.map((d) => {
                            const key = dateKey(d);
                            const dayEvents = filterByVisibleKinds(eventsByDay.get(key) || []);
                            const layout = buildDayLayout(dayEvents);
                            return (
                              <Box
                                key={`week-col-${key}`}
                                onClick={(evt) =>
                                  openAddEvent({ date: d, minutes: minuteFromClick(evt) })
                                }
                                sx={{
                                  position: "relative",
                                  borderLeft: "1px solid",
                                  borderColor: "divider",
                                  backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${HOUR_ROW_HEIGHT - 1}px, rgba(0,0,0,0.06) ${HOUR_ROW_HEIGHT - 1}px, rgba(0,0,0,0.06) ${HOUR_ROW_HEIGHT}px)`,
                                }}
                              >
                                <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ p: 0.75, position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 }}>
                                  {layout.allDay.map((e, idx) => (
                                    <CalendarEventCard
                                      key={`all-day-${key}-${idx}`}
                                      event={e}
                                      palette={eventPalette(e.kind)}
                                      variant="chip"
                                      onClick={setSelectedEvent}
                                    />
                                  ))}
                                </Stack>
                                {layout.timed.map((e, idx) => {
                                  const startMin = Math.max(0, minutesSinceDayStart(e.start));
                                  const endMin = Math.min(24 * 60, minutesSinceDayStart(e.end));
                                  const duration = Math.max(30, endMin - startMin);
                                  const top = (startMin / 60) * HOUR_ROW_HEIGHT;
                                  const height = (duration / 60) * HOUR_ROW_HEIGHT;
                                  const width = `calc(${100 / e.overlapCount}% - 4px)`;
                                  const left = `calc(${(100 / e.overlapCount) * e.col}% + 2px)`;
                                  const palette = eventPalette(e.kind);
                                  return (
                                    <Box
                                      key={`timed-${key}-${idx}`}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => setSelectedEvent(e)}
                                      onKeyDown={(evt) => {
                                        if (evt.key === "Enter" || evt.key === " ") setSelectedEvent(e);
                                      }}
                                      sx={{
                                        position: "absolute",
                                        top,
                                        left,
                                        height,
                                        width,
                                        borderRadius: 1.5,
                                        px: 0.75,
                                        py: 0.5,
                                        cursor: "pointer",
                                        border: "1px solid",
                                        borderColor: palette.border,
                                        bgcolor: palette.background,
                                        color: palette.text,
                                        overflow: "hidden",
                                        boxShadow: "0 1px 3px rgba(16,24,40,.18)",
                                        transition: "transform .12s ease, box-shadow .12s ease",
                                        "&:hover": {
                                          transform: "translateY(-1px)",
                                          boxShadow: "0 4px 10px rgba(16,24,40,.2)",
                                        },
                                      }}
                                    >
                                      <CalendarEventCard
                                        event={{ ...e, timeLabel: formatTimeRange(e.start, e.end) }}
                                        palette={palette}
                                        variant="block"
                                        onClick={setSelectedEvent}
                                      />
                                    </Box>
                                  );
                                })}
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ) : null}

              {!loading && view === "day" ? (
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      position: "sticky",
                      top: 0,
                      zIndex: 3,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {cursorDate.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: { xs: "58vh", sm: "62vh", md: "66vh" },
                      minHeight: 420,
                      maxHeight: 760,
                      overflowY: "auto",
                    }}
                  >
                    <Box sx={{ display: "grid", gridTemplateColumns: "72px 1fr", minHeight: HOUR_ROW_HEIGHT * (END_HOUR - START_HOUR) }}>
                      <Box
                        sx={{
                          position: "sticky",
                          left: 0,
                          zIndex: 2,
                          borderRight: "1px solid",
                          borderColor: "divider",
                          bgcolor: "background.paper",
                        }}
                      >
                        <Box sx={{ position: "relative", minHeight: HOUR_ROW_HEIGHT * (END_HOUR - START_HOUR) }}>
                          {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
                            <Typography
                              key={`day-time-${i}`}
                              variant="caption"
                              color="text.secondary"
                              sx={{ position: "absolute", top: i === 0 ? 4 : i * HOUR_ROW_HEIGHT - 8, right: 8 }}
                            >
                              {`${String((i + START_HOUR) % 24).padStart(2, "0")}:00`}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                      <Box
                        onClick={(evt) =>
                          openAddEvent({ date: cursorDate, minutes: minuteFromClick(evt) })
                        }
                        sx={{
                          position: "relative",
                          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${HOUR_ROW_HEIGHT - 1}px, rgba(0,0,0,0.06) ${HOUR_ROW_HEIGHT - 1}px, rgba(0,0,0,0.06) ${HOUR_ROW_HEIGHT}px)`,
                        }}
                      >
                        {(() => {
                          const layout = buildDayLayout(filterByVisibleKinds(dayEvents));
                          return (
                            <>
                              <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ p: 0.9, position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 }}>
                                {layout.allDay.map((e, idx) => (
                                  <CalendarEventCard
                                    key={`day-all-${idx}`}
                                    event={e}
                                    palette={eventPalette(e.kind)}
                                    variant="chip"
                                    onClick={setSelectedEvent}
                                  />
                                ))}
                              </Stack>
                              {layout.timed.length === 0 ? (
                                <Typography color="text.secondary" sx={{ p: 2 }}>
                                  No timed blocks for this day.
                                </Typography>
                              ) : null}
                              {layout.timed.map((e, idx) => {
                                const startMin = Math.max(0, minutesSinceDayStart(e.start));
                                const endMin = Math.min(24 * 60, minutesSinceDayStart(e.end));
                                const duration = Math.max(30, endMin - startMin);
                                const top = (startMin / 60) * HOUR_ROW_HEIGHT;
                                const height = (duration / 60) * HOUR_ROW_HEIGHT;
                                const width = `calc(${100 / e.overlapCount}% - 8px)`;
                                const left = `calc(${(100 / e.overlapCount) * e.col}% + 4px)`;
                                const palette = eventPalette(e.kind);
                                return (
                                  <Box
                                    key={`day-timed-${idx}`}
                                    onClick={() => setSelectedEvent(e)}
                                    sx={{
                                      position: "absolute",
                                      top,
                                      left,
                                      height,
                                      width,
                                      borderRadius: 1.5,
                                      p: 0.75,
                                      cursor: "pointer",
                                      border: "1px solid",
                                      borderColor: palette.border,
                                      bgcolor: palette.background,
                                      color: palette.text,
                                      overflow: "hidden",
                                      boxShadow: "0 2px 8px rgba(16,24,40,.16)",
                                    }}
                                  >
                                    <CalendarEventCard
                                      event={{ ...e, timeLabel: formatTimeRange(e.start, e.end) }}
                                      palette={palette}
                                      variant="block"
                                      onClick={setSelectedEvent}
                                    />
                                  </Box>
                                );
                              })}
                            </>
                          );
                        })()}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ) : null}
            </CardContent>
          </Card>
        </Stack>
      </Container>
      <AddEventModal
        open={addEventOpen}
        onClose={() => {
          setAddEventOpen(false);
          setEditingEventId(null);
          setEventDraft(null);
        }}
        onSave={saveCustomEvent}
        aircraftOptions={aircraftOptions}
        initialValues={eventDraft}
        mode={editingEventId ? "edit" : "create"}
      />
      <EventDetailsPanel
        open={Boolean(selectedEvent)}
        event={
          selectedEvent
            ? { ...selectedEvent, editable: Boolean(selectedEvent.editable && canDeleteCalendarEvent) }
            : selectedEvent
        }
        onClose={() => setSelectedEvent(null)}
        onEdit={openEditEvent}
        onDelete={removeEvent}
        palette={selectedEvent ? eventPalette(selectedEvent.kind) : undefined}
      />
    </Box>
  );
}
