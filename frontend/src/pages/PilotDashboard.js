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
import { useSearchParams } from "react-router";
import {
  createCompanyFlightRequest,
  createDiscrepancy,
  fetchCompanyAircrafts,
  fetchCompanyDiscrepancies,
  fetchCompanyFlights,
  fetchCompanyUsers,
  fetchCurrentUser,
  patchCompanyFlightDispatch,
  updateDiscrepancy,
} from "../shared/Api";
import { formatAircraftRef } from "../shared/aircraftDisplay";
import ScrollableTableContainer from "../components/ScrollableTableContainer";
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

const PILOT_EDITABLE_REQUEST_FIELDS = new Set([
  "departure_time",
  "arrival_time",
  "route",
  "secondary_pilot",
]);
const PILOT_EDITABLE_DISCREPANCY_FIELDS = new Set([
  "ata_code",
  "tach_time",
  "description",
]);
const PILOT_FLIGHT_EDIT_TRAIL_KEY = "pilotFlightEditTrail";
const PILOT_DISCREPANCY_EDIT_TRAIL_KEY = "pilotDiscrepancyEditTrail";

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

function toDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
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

function formatEditedAt(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function editorNameFromUser(user) {
  if (!user) return "Unknown user";
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return name || user.username || `User #${user.id}`;
}

function resolveTrailEditorName(entry, nameByUserId) {
  if (entry?.editedByName) return entry.editedByName;
  const id = Number(entry?.editedBy);
  if (Number.isFinite(id) && nameByUserId?.get(id)) return nameByUserId.get(id);
  return "Unknown user";
}

function refIdString(ref) {
  if (ref === null || ref === undefined || ref === "") return "";
  if (typeof ref === "object") {
    const id = ref?.id ?? ref?.pk;
    return id == null ? "" : String(id);
  }
  return String(ref);
}

function getChangedFlightFields(current, baseline) {
  if (!current || !baseline) return [];
  const labels = {
    departure_time: "Departure",
    arrival_time: "Arrival",
    route: "Route notes",
    secondary_pilot: "Secondary pilot",
  };
  return Object.keys(labels)
    .filter((k) => (current?.[k] ?? "") !== (baseline?.[k] ?? ""))
    .map((k) => labels[k]);
}

function getFlightFieldValueSummary(form) {
  if (!form) return {};
  return {
    departure_time: form.departure_time || "",
    arrival_time: form.arrival_time || "",
    route: form.route || "",
    secondary_pilot: form.secondary_pilot || "",
  };
}

function normalizeTrailMap(value) {
  if (!value || typeof value !== "object") return {};
  const out = {};
  Object.entries(value).forEach(([flightId, entry]) => {
    if (Array.isArray(entry)) {
      out[flightId] = entry;
      return;
    }
    if (entry && typeof entry === "object") {
      out[flightId] = [entry];
      return;
    }
    out[flightId] = [];
  });
  return out;
}

function formatFieldValue(field, value, pilotsById) {
  if (!value) return "—";
  if (field === "secondary_pilot") {
    const id = Number(value);
    if (Number.isNaN(id)) return String(value);
    return pilotsById.get(id) || `User #${id}`;
  }
  return String(value);
}

function getChangedDiscrepancyFields(current, baseline) {
  if (!current || !baseline) return [];
  const labels = {
    ata_code: "ATA code",
    tach_time: "Tach time",
    description: "Description",
  };
  return Object.keys(labels)
    .filter((k) => (current?.[k] ?? "") !== (baseline?.[k] ?? ""))
    .map((k) => labels[k]);
}

export default function PilotDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [editingSelectedFlight, setEditingSelectedFlight] = useState(false);
  const [savingSelectedFlight, setSavingSelectedFlight] = useState(false);
  const [selectedFlightBaseline, setSelectedFlightBaseline] = useState(null);
  const [selectedFlightEditedAt, setSelectedFlightEditedAt] = useState("");
  const [savedFlightEditTrail, setSavedFlightEditTrail] = useState(() => {
    try {
      const raw = localStorage.getItem(PILOT_FLIGHT_EDIT_TRAIL_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return normalizeTrailMap(parsed);
    } catch {
      return {};
    }
  });
  const [selectedFlightDirtyFields, setSelectedFlightDirtyFields] = useState([]);
  const [selectedFlightForm, setSelectedFlightForm] = useState({
    flight_number: "",
    aircraft: "",
    origin: "",
    destination: "",
    departure_time: "",
    arrival_time: "",
    route: "",
    flight_type: "training",
    pilot_requirement: "private",
    secondary_pilot: "",
  });
  const [requestFlightOpen, setRequestFlightOpen] = useState(false);
  const [reportDiscrepancyOpen, setReportDiscrepancyOpen] = useState(false);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState(null);
  const [editingSelectedDiscrepancy, setEditingSelectedDiscrepancy] = useState(false);
  const [savingSelectedDiscrepancy, setSavingSelectedDiscrepancy] = useState(false);
  const [selectedDiscrepancyBaseline, setSelectedDiscrepancyBaseline] = useState(null);
  const [selectedDiscrepancyEditedAt, setSelectedDiscrepancyEditedAt] = useState("");
  const [savedDiscrepancyEditTrail, setSavedDiscrepancyEditTrail] = useState(() => {
    try {
      const raw = localStorage.getItem(PILOT_DISCREPANCY_EDIT_TRAIL_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return normalizeTrailMap(parsed);
    } catch {
      return {};
    }
  });
  const [selectedDiscrepancyForm, setSelectedDiscrepancyForm] = useState({
    ata_code: "",
    tach_time: "",
    description: "",
  });
  const [flightFormEditedAt, setFlightFormEditedAt] = useState("");
  const [discFormEditedAt, setDiscFormEditedAt] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(PILOT_FLIGHT_EDIT_TRAIL_KEY, JSON.stringify(savedFlightEditTrail));
    } catch {
      // Ignore localStorage write issues.
    }
  }, [savedFlightEditTrail]);

  useEffect(() => {
    try {
      localStorage.setItem(
        PILOT_DISCREPANCY_EDIT_TRAIL_KEY,
        JSON.stringify(savedDiscrepancyEditTrail)
      );
    } catch {
      // Ignore localStorage write issues.
    }
  }, [savedDiscrepancyEditTrail]);

  const [flightForm, setFlightForm] = useState(INITIAL_FLIGHT_FORM);
  const [discForm, setDiscForm] = useState(INITIAL_DISC_FORM);

  const trailEditor = useMemo(() => {
    const user = currentUser || state.user;
    return {
      id: user?.id != null ? Number(user.id) : null,
      name: editorNameFromUser(user),
    };
  }, [currentUser, state.user]);

  const pilotNameById = useMemo(() => {
    const map = new Map();
    if (currentUser?.id) {
      map.set(Number(currentUser.id), editorNameFromUser(currentUser));
    }
    if (state.user?.id && !map.has(Number(state.user.id))) {
      map.set(Number(state.user.id), editorNameFromUser(state.user));
    }
    (pilots || []).forEach((p) => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      map.set(Number(p.id), name || p.username || `User #${p.id}`);
    });
    return map;
  }, [pilots, currentUser, state.user]);

  const aircraftNameById = useMemo(() => {
    const map = new Map();
    (aircraft || []).forEach((a) => {
      const name = [a.registration_number, a.model ? `(${a.model})` : ""].filter(Boolean).join(" ");
      map.set(Number(a.id), name || `Aircraft #${a.id}`);
    });
    return map;
  }, [aircraft]);

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
    return discrepancies.filter((d) => {
      const rid = toId(d?.reporter);
      return !Number.isNaN(rid) && rid === uid;
    });
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

  const canEditSelectedFlight = useMemo(() => {
    if (!selectedFlight || !currentUser?.id) return false;
    const isOwnPrimary =
      toId(selectedFlight?.primary_pilot ?? selectedFlight?.primary_pilot_id) === Number(currentUser.id);
    return isOwnPrimary && selectedFlight?.status === "pending approval";
  }, [selectedFlight, currentUser]);

  const openFlightDetails = (flight) => {
    setEditingSelectedFlight(false);
    setSelectedFlight(flight);
    const nextForm = {
      flight_number: flight?.flight_number || "",
      aircraft: String(flight?.aircraft?.id ?? flight?.aircraft ?? ""),
      origin: flight?.origin || "",
      destination: flight?.destination || "",
      departure_time: toDatetimeLocal(flight?.departure_time),
      arrival_time: toDatetimeLocal(flight?.arrival_time),
      route: flight?.route || "",
      flight_type: flight?.flight_type || "training",
      pilot_requirement: flight?.pilot_requirement || "private",
      secondary_pilot: refIdString(flight?.secondary_pilot),
    };
    setSelectedFlightForm(nextForm);
    setSelectedFlightBaseline(nextForm);
    setSelectedFlightEditedAt("");
    setSelectedFlightDirtyFields([]);
  };

  const closeFlightDetails = () => {
    setEditingSelectedFlight(false);
    setSelectedFlight(null);
    setSelectedFlightBaseline(null);
    setSelectedFlightEditedAt("");
    setSelectedFlightDirtyFields([]);
  };

  const updateSelectedFlightForm = (field, value) => {
    if (!PILOT_EDITABLE_REQUEST_FIELDS.has(field)) return;
    setSelectedFlightForm((s) => ({ ...s, [field]: value }));
    setSelectedFlightEditedAt(new Date().toISOString());
    setSelectedFlightDirtyFields((prev) =>
      prev.includes(field) ? prev : [...prev, field]
    );
  };

  const updateFlightForm = (field, value) => {
    setFlightForm((s) => ({ ...s, [field]: value }));
    setFlightFormEditedAt(new Date().toISOString());
  };

  const updateDiscForm = (field, value) => {
    setDiscForm((s) => ({ ...s, [field]: value }));
    setDiscFormEditedAt(new Date().toISOString());
  };

  const canEditSelectedDiscrepancy = useMemo(() => {
    if (!selectedDiscrepancy || !currentUser?.id) return false;
    const rid = toId(selectedDiscrepancy.reporter);
    return (
      !Number.isNaN(rid) &&
      rid === Number(currentUser.id) &&
      String(selectedDiscrepancy.status || "").toLowerCase() !== "closed"
    );
  }, [selectedDiscrepancy, currentUser]);

  const openDiscrepancyDetails = (disc) => {
    setEditingSelectedDiscrepancy(false);
    setSelectedDiscrepancy(disc);
    const nextForm = {
      ata_code: disc?.ata_code || "",
      tach_time: disc?.tach_time || "",
      description: disc?.description || "",
    };
    setSelectedDiscrepancyForm(nextForm);
    setSelectedDiscrepancyBaseline(nextForm);
    setSelectedDiscrepancyEditedAt("");
  };

  const closeDiscrepancyDetails = () => {
    setEditingSelectedDiscrepancy(false);
    setSelectedDiscrepancy(null);
    setSelectedDiscrepancyBaseline(null);
    setSelectedDiscrepancyEditedAt("");
  };

  useEffect(() => {
    const discId = searchParams.get("disc");
    if (!discId || !discrepancies.length) return;
    const id = Number(discId);
    if (!Number.isFinite(id)) return;
    const disc = discrepancies.find((d) => Number(d.id) === id);
    if (!disc) return;
    openDiscrepancyDetails(disc);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("disc");
        return next;
      },
      { replace: true }
    );
  }, [discrepancies, searchParams, setSearchParams]);

  const updateSelectedDiscrepancyForm = (field, value) => {
    if (!PILOT_EDITABLE_DISCREPANCY_FIELDS.has(field)) return;
    setSelectedDiscrepancyForm((s) => ({ ...s, [field]: value }));
    setSelectedDiscrepancyEditedAt(new Date().toISOString());
  };

  const selectedDiscrepancyChangedFields = useMemo(() => {
    if (!editingSelectedDiscrepancy || !selectedDiscrepancyBaseline) return [];
    return getChangedDiscrepancyFields(selectedDiscrepancyForm, selectedDiscrepancyBaseline);
  }, [editingSelectedDiscrepancy, selectedDiscrepancyBaseline, selectedDiscrepancyForm]);

  const selectedDiscrepancySavedTrail = useMemo(() => {
    if (!selectedDiscrepancy?.id) return [];
    return Array.isArray(savedDiscrepancyEditTrail[selectedDiscrepancy.id])
      ? savedDiscrepancyEditTrail[selectedDiscrepancy.id]
      : [];
  }, [savedDiscrepancyEditTrail, selectedDiscrepancy]);

  const saveSelectedDiscrepancyEdit = async () => {
    if (!selectedDiscrepancy?.id) return;
    if (!selectedDiscrepancyForm.description) {
      setError("Description is required.");
      return;
    }
    setSavingSelectedDiscrepancy(true);
    setError("");
    try {
      const changedBeforeSave = getChangedDiscrepancyFields(
        selectedDiscrepancyForm,
        selectedDiscrepancyBaseline
      );
      const updated = await updateDiscrepancy(selectedDiscrepancy.id, {
        ata_code: selectedDiscrepancyForm.ata_code || "",
        tach_time: selectedDiscrepancyForm.tach_time || "",
        description: selectedDiscrepancyForm.description || "",
      });
      setDiscrepancies((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setSelectedDiscrepancy(updated);
      setEditingSelectedDiscrepancy(false);
      if (changedBeforeSave.length > 0) {
        setSavedDiscrepancyEditTrail((prev) => ({
          ...prev,
          [updated.id]: [
            ...(Array.isArray(prev?.[updated.id]) ? prev[updated.id] : []),
            {
              fields: changedBeforeSave,
              editedAt: new Date().toISOString(),
              editedBy: trailEditor.id,
              editedByName: trailEditor.name,
            },
          ],
        }));
      }
      setSelectedDiscrepancyEditedAt("");
    } catch (e) {
      setError(e?.message || "Could not update discrepancy.");
    } finally {
      setSavingSelectedDiscrepancy(false);
    }
  };

  const saveSelectedFlightEdit = async () => {
    if (!selectedFlight?.id) return;
    const dep = toIsoFromDatetimeLocal(selectedFlightForm.departure_time);
    const arr = toIsoFromDatetimeLocal(selectedFlightForm.arrival_time);
    if (!dep || !arr) {
      setError("Departure and arrival date and time are required.");
      return;
    }
    setSavingSelectedFlight(true);
    setError("");
    try {
      const changedFieldMap = {
        departure_time: "Departure",
        arrival_time: "Arrival",
        route: "Route notes",
        secondary_pilot: "Secondary pilot",
      };
      const unionRaw = new Set([
        ...selectedFlightDirtyFields,
        ...Object.keys(changedFieldMap).filter(
          (k) =>
            (selectedFlightForm?.[k] ?? "") !== (selectedFlightBaseline?.[k] ?? "")
        ),
      ]);
      const unionFields = [...unionRaw].filter((k) => changedFieldMap[k]);
      const changeDetails = unionFields.map((field) => ({
        field,
        label: changedFieldMap[field],
        before: selectedFlightBaseline?.[field] ?? "",
        after: selectedFlightForm?.[field] ?? "",
      }));
      const updated = await patchCompanyFlightDispatch(selectedFlight.id, {
        departure_time: dep,
        arrival_time: arr,
        route: selectedFlightForm.route || "",
        secondary_pilot: selectedFlightForm.secondary_pilot
          ? Number(selectedFlightForm.secondary_pilot)
          : null,
      });
      setFlights((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setSelectedFlight(updated);
      setEditingSelectedFlight(false);
      if (unionFields.length > 0) {
        const values = getFlightFieldValueSummary(selectedFlightForm);
        setSavedFlightEditTrail((prev) => ({
          ...prev,
          [updated.id]: [
            ...(Array.isArray(prev?.[updated.id]) ? prev[updated.id] : []),
            {
              fields: unionFields.map((f) => changedFieldMap[f]),
              changes: changeDetails,
              editedAt: new Date().toISOString(),
              editedBy: trailEditor.id,
              editedByName: trailEditor.name,
              values,
            },
          ],
        }));
      }
      setSelectedFlightEditedAt("");
      setSelectedFlightDirtyFields([]);
    } catch (e) {
      setError(e?.message || "Could not update flight request.");
    } finally {
      setSavingSelectedFlight(false);
    }
  };

  const displayValue = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "object") return formatAircraftRef(v, aircraftNameById);
    return String(v);
  };

  const displayAircraft = (row) =>
    row?.aircraft_name ||
    formatAircraftRef(row?.aircraft, aircraftNameById);

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

  const selectedFlightChangedFields = useMemo(() => {
    if (!editingSelectedFlight || !selectedFlightBaseline) return [];
    const labels = {
      departure_time: "Departure",
      arrival_time: "Arrival",
      route: "Route notes",
      secondary_pilot: "Secondary pilot",
    };
    return Object.keys(labels)
      .filter((k) => (selectedFlightForm?.[k] ?? "") !== (selectedFlightBaseline?.[k] ?? ""))
      .map((k) => labels[k]);
  }, [editingSelectedFlight, selectedFlightBaseline, selectedFlightForm]);

  const selectedFlightSavedTrail = useMemo(() => {
    if (!selectedFlight?.id) return null;
    return Array.isArray(savedFlightEditTrail[selectedFlight.id])
      ? savedFlightEditTrail[selectedFlight.id]
      : [];
  }, [savedFlightEditTrail, selectedFlight]);

  const requestFlightChangedFields = useMemo(() => {
    const labels = {
      aircraft: "Aircraft",
      flight_number: "Flight number",
      origin: "Origin",
      destination: "Destination",
      departure_time: "Departure",
      arrival_time: "Arrival",
      route: "Route notes",
      flight_type: "Flight type",
      pilot_requirement: "Certificate requirement",
      secondary_pilot: "Secondary pilot",
    };
    return Object.keys(labels)
      .filter((k) => (flightForm?.[k] ?? "") !== (INITIAL_FLIGHT_FORM?.[k] ?? ""))
      .map((k) => labels[k]);
  }, [flightForm]);

  const discrepancyChangedFields = useMemo(() => {
    const labels = {
      aircraft: "Aircraft",
      ata_code: "ATA code",
      tach_time: "Tach time",
      description: "Description",
    };
    return Object.keys(labels)
      .filter((k) => (discForm?.[k] ?? "") !== (INITIAL_DISC_FORM?.[k] ?? ""))
      .map((k) => labels[k]);
  }, [discForm]);

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
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3 }, minWidth: 0 }}>
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
                Use these actions to submit a flight request or report a maintenance discrepancy.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ flex: 1 }}
                  onClick={() => {
                    setError("");
                    setFlightFormEditedAt("");
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
                    setDiscFormEditedAt("");
                    setReportDiscrepancyOpen(true);
                  }}
                  disabled={loading}
                >
                  Report discrepancy
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", minWidth: 0 }}>
            <CardContent sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                My flights
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Your assigned and requested flights.
              </Typography>
              <ScrollableTableContainer minWidth={880}>
              <Table size="small" sx={{ '& .MuiTableCell-head': { whiteSpace: 'nowrap' } }}>
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
                        onClick={() => openFlightDetails(f)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openFlightDetails(f);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell>{statusChip(f.status)}</TableCell>
                        <TableCell>{f.flight_number || "—"}</TableCell>
                        <TableCell>{roleOnFlight(f)}</TableCell>
                        <TableCell>{displayAircraft(f)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {(f.origin || "—") + " → " + (f.destination || "—")}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDt(f.departure_time)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDt(f.arrival_time)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </ScrollableTableContainer>
            </CardContent>
          </Card>

          <Dialog
            open={Boolean(selectedFlight)}
            onClose={closeFlightDetails}
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
                onClick={closeFlightDetails}
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
                      {editingSelectedFlight ? "Edit your pending request" : "Submitted values"}
                    </Typography>
                    {statusChip(selectedFlight.status)}
                  </Stack>
                  <TextField
                    label="Flight number"
                    size="small"
                    fullWidth
                    value={editingSelectedFlight ? selectedFlightForm.flight_number : displayValue(selectedFlight.flight_number)}
                    onChange={(e) => updateSelectedFlightForm("flight_number", e.target.value)}
                    InputProps={{ readOnly: true }}
                    sx={
                      editingSelectedFlight
                        ? { "& .MuiInputBase-root": { bgcolor: "action.hover", opacity: 0.85 } }
                        : undefined
                    }
                  />
                  <TextField
                    label="Aircraft"
                    size="small"
                    fullWidth
                    value={displayAircraft(selectedFlight)}
                    InputProps={{ readOnly: true }}
                    sx={
                      editingSelectedFlight
                        ? { "& .MuiInputBase-root": { bgcolor: "action.hover", opacity: 0.85 } }
                        : undefined
                    }
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Origin"
                      size="small"
                      fullWidth
                      value={editingSelectedFlight ? selectedFlightForm.origin : displayValue(selectedFlight.origin)}
                      onChange={(e) => updateSelectedFlightForm("origin", e.target.value)}
                      InputProps={{ readOnly: true }}
                      sx={
                        editingSelectedFlight
                          ? { "& .MuiInputBase-root": { bgcolor: "action.hover", opacity: 0.85 } }
                          : undefined
                      }
                    />
                    <TextField
                      label="Destination"
                      size="small"
                      fullWidth
                      value={
                        editingSelectedFlight
                          ? selectedFlightForm.destination
                          : displayValue(selectedFlight.destination)
                      }
                      onChange={(e) => updateSelectedFlightForm("destination", e.target.value)}
                      InputProps={{ readOnly: true }}
                      sx={
                        editingSelectedFlight
                          ? { "& .MuiInputBase-root": { bgcolor: "action.hover", opacity: 0.85 } }
                          : undefined
                      }
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Departure"
                      type={editingSelectedFlight ? "datetime-local" : "text"}
                      size="small"
                      fullWidth
                      value={
                        editingSelectedFlight
                          ? selectedFlightForm.departure_time
                          : formatDt(selectedFlight.departure_time)
                      }
                      onChange={(e) => updateSelectedFlightForm("departure_time", e.target.value)}
                      InputLabelProps={editingSelectedFlight ? { shrink: true } : undefined}
                      InputProps={{ readOnly: !editingSelectedFlight }}
                    />
                    <TextField
                      label="Arrival"
                      type={editingSelectedFlight ? "datetime-local" : "text"}
                      size="small"
                      fullWidth
                      value={
                        editingSelectedFlight
                          ? selectedFlightForm.arrival_time
                          : formatDt(selectedFlight.arrival_time)
                      }
                      onChange={(e) => updateSelectedFlightForm("arrival_time", e.target.value)}
                      InputLabelProps={editingSelectedFlight ? { shrink: true } : undefined}
                      InputProps={{ readOnly: !editingSelectedFlight }}
                    />
                  </Stack>
                  <TextField
                    label="Route notes"
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    value={
                      editingSelectedFlight
                        ? selectedFlightForm.route
                        : displayValue(selectedFlight.route || selectedFlight.route_notes)
                    }
                    onChange={(e) => updateSelectedFlightForm("route", e.target.value)}
                    InputProps={{ readOnly: !editingSelectedFlight }}
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Flight type"
                      size="small"
                      fullWidth
                      value={displayChoice(selectedFlight.flight_type)}
                      InputProps={{ readOnly: true }}
                      sx={
                        editingSelectedFlight
                          ? { "& .MuiInputBase-root": { bgcolor: "action.hover", opacity: 0.85 } }
                          : undefined
                      }
                    />
                    <TextField
                      label="Certificate requirement"
                      size="small"
                      fullWidth
                      value={displayChoice(selectedFlight.pilot_requirement)}
                      InputProps={{ readOnly: true }}
                      sx={
                        editingSelectedFlight
                          ? { "& .MuiInputBase-root": { bgcolor: "action.hover", opacity: 0.85 } }
                          : undefined
                      }
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    {editingSelectedFlight ? (
                      <FormControl fullWidth size="small">
                        <InputLabel id="pilot-edit-sec-label">Secondary pilot</InputLabel>
                        <Select
                          id="pilot-edit-sec"
                          labelId="pilot-edit-sec-label"
                          label="Secondary pilot"
                          value={selectedFlightForm.secondary_pilot}
                          onChange={(e) => updateSelectedFlightForm("secondary_pilot", e.target.value)}
                        >
                          <MenuItem value="">None</MenuItem>
                          {pilots.map((p) => (
                            <MenuItem key={p.id} value={String(p.id)}>
                              {p.first_name} {p.last_name} ({p.username})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <TextField
                        label="Secondary pilot"
                        size="small"
                        fullWidth
                        value={displayValue(
                          displayPilot(selectedFlight.secondary_pilot_name || selectedFlight.secondary_pilot)
                        )}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                    <TextField
                      label="Your role"
                      size="small"
                      fullWidth
                      value={roleOnFlight(selectedFlight)}
                      InputProps={{ readOnly: true }}
                    />
                  </Stack>
                  {editingSelectedFlight && selectedFlightChangedFields.length > 0 ? (
                    <Alert severity="info">
                      Edited fields: {selectedFlightChangedFields.join(", ")}. Last change:{" "}
                      {formatEditedAt(selectedFlightEditedAt)}
                    </Alert>
                  ) : null}
                  {!editingSelectedFlight && selectedFlightSavedTrail.length > 0 ? (
                    <Alert severity="info">
                      Last saved edit by{" "}
                      {resolveTrailEditorName(
                        selectedFlightSavedTrail[selectedFlightSavedTrail.length - 1],
                        pilotNameById
                      )}
                      : {selectedFlightSavedTrail[selectedFlightSavedTrail.length - 1].fields.join(", ")} on{" "}
                      {formatEditedAt(selectedFlightSavedTrail[selectedFlightSavedTrail.length - 1].editedAt)}
                    </Alert>
                  ) : null}
                  {!editingSelectedFlight && selectedFlightSavedTrail.length > 0 ? (
                    <Box
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1.5,
                        p: 1.5,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Edit history
                      </Typography>
                      <Stack spacing={1}>
                        {[...selectedFlightSavedTrail]
                          .slice(-10)
                          .reverse()
                          .map((entry, idx) => (
                            <Box
                              key={`${entry.editedAt}-${idx}`}
                              sx={{ p: 1, borderRadius: 1, bgcolor: "action.hover" }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {resolveTrailEditorName(entry, pilotNameById)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {formatEditedAt(entry.editedAt)}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
                                Changed: {Array.isArray(entry.fields) ? entry.fields.join(", ") : "—"}
                              </Typography>
                              {Array.isArray(entry.changes) && entry.changes.length > 0 ? (
                                <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                                  {entry.changes.map((change, i) => (
                                    <Typography key={`${change.field}-${i}`} variant="caption" color="text.secondary">
                                      {change.label}:{" "}
                                      {formatFieldValue(change.field, change.before, pilotNameById)} ->{" "}
                                      {formatFieldValue(change.field, change.after, pilotNameById)}
                                    </Typography>
                                  ))}
                                </Stack>
                              ) : null}
                            </Box>
                          ))}
                      </Stack>
                    </Box>
                  ) : null}
                </Stack>
              ) : null}
            </DialogContent>
            <DialogActions>
              {editingSelectedFlight ? (
                <>
                  <Button onClick={() => setEditingSelectedFlight(false)} disabled={savingSelectedFlight}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={saveSelectedFlightEdit}
                    disabled={savingSelectedFlight}
                  >
                    {savingSelectedFlight ? "Saving…" : "Save changes"}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={closeFlightDetails}>Close</Button>
                  {canEditSelectedFlight ? (
                    <Button variant="contained" onClick={() => setEditingSelectedFlight(true)}>
                      Edit request
                    </Button>
                  ) : null}
                </>
              )}
            </DialogActions>
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
                    onChange={(e) => updateFlightForm("aircraft", e.target.value)}
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
                  onChange={(e) => updateFlightForm("flight_number", e.target.value)}
                  fullWidth
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Origin"
                    size="small"
                    value={flightForm.origin}
                    onChange={(e) => updateFlightForm("origin", e.target.value)}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Destination"
                    size="small"
                    value={flightForm.destination}
                    onChange={(e) => updateFlightForm("destination", e.target.value)}
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
                    onChange={(e) => updateFlightForm("departure_time", e.target.value)}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Arrival"
                    type="datetime-local"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={flightForm.arrival_time}
                    onChange={(e) => updateFlightForm("arrival_time", e.target.value)}
                    fullWidth
                    required
                  />
                </Stack>
                <TextField
                  label="Route notes (optional)"
                  size="small"
                  value={flightForm.route}
                  onChange={(e) => updateFlightForm("route", e.target.value)}
                  fullWidth
                />
                <FormControl fullWidth size="small">
                  <InputLabel id="pilot-req-ftype-label">Flight type</InputLabel>
                  <Select
                    id="pilot-req-ftype"
                    labelId="pilot-req-ftype-label"
                    label="Flight type"
                    value={flightForm.flight_type}
                    onChange={(e) => updateFlightForm("flight_type", e.target.value)}
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
                    onChange={(e) => updateFlightForm("pilot_requirement", e.target.value)}
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
                    onChange={(e) => updateFlightForm("secondary_pilot", e.target.value)}
                  >
                    <MenuItem value="">None</MenuItem>
                    {pilots.map((p) => (
                      <MenuItem key={p.id} value={String(p.id)}>
                        {p.first_name} {p.last_name} ({p.username})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {requestFlightChangedFields.length > 0 ? (
                  <Alert severity="info">
                    Edited fields: {requestFlightChangedFields.join(", ")}. Last change:{" "}
                    {formatEditedAt(flightFormEditedAt)}
                  </Alert>
                ) : null}
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
                    onChange={(e) => updateDiscForm("aircraft", e.target.value)}
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
                    onChange={(e) => updateDiscForm("ata_code", e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Tach time"
                    size="small"
                    value={discForm.tach_time}
                    onChange={(e) => updateDiscForm("tach_time", e.target.value)}
                    fullWidth
                  />
                </Stack>
                <TextField
                  label="Description"
                  size="small"
                  multiline
                  minRows={3}
                  value={discForm.description}
                  onChange={(e) => updateDiscForm("description", e.target.value)}
                  fullWidth
                  required
                />
                {discrepancyChangedFields.length > 0 ? (
                  <Alert severity="info">
                    Edited fields: {discrepancyChangedFields.join(", ")}. Last change:{" "}
                    {formatEditedAt(discFormEditedAt)}
                  </Alert>
                ) : null}
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

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", minWidth: 0 }}>
            <CardContent sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                My discrepancy reports
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Issues you reported.
              </Typography>
              <ScrollableTableContainer minWidth={560}>
              <Table size="small" sx={{ '& .MuiTableCell-head': { whiteSpace: 'nowrap' } }}>
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
                      <TableRow
                        key={d.id}
                        hover
                        onClick={() => openDiscrepancyDetails(d)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openDiscrepancyDetails(d);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell>{d.date_reported || "—"}</TableCell>
                        <TableCell>{d.status || "—"}</TableCell>
                        <TableCell>{d.ata_code || "—"}</TableCell>
                        <TableCell sx={{ minWidth: 200, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {d.description || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </ScrollableTableContainer>
            </CardContent>
          </Card>

          <Dialog
            open={Boolean(selectedDiscrepancy)}
            onClose={closeDiscrepancyDetails}
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
              <Typography variant="inherit">Discrepancy details</Typography>
              <IconButton aria-label="Close" onClick={closeDiscrepancyDetails} edge="end" sx={{ mr: 0.5 }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {selectedDiscrepancy ? (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {editingSelectedDiscrepancy ? "Edit your discrepancy report" : "Submitted values"}
                    </Typography>
                    {statusChip(selectedDiscrepancy.status)}
                  </Stack>
                  <TextField
                    label="Reported date"
                    size="small"
                    fullWidth
                    value={selectedDiscrepancy.date_reported || "—"}
                    InputProps={{ readOnly: true }}
                    sx={
                      editingSelectedDiscrepancy
                        ? { "& .MuiInputBase-root": { bgcolor: "action.hover", opacity: 0.85 } }
                        : undefined
                    }
                  />
                  <TextField
                    label="Aircraft"
                    size="small"
                    fullWidth
                    value={displayAircraft(selectedDiscrepancy)}
                    InputProps={{ readOnly: true }}
                    sx={
                      editingSelectedDiscrepancy
                        ? { "& .MuiInputBase-root": { bgcolor: "action.hover", opacity: 0.85 } }
                        : undefined
                    }
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="ATA code"
                      size="small"
                      fullWidth
                      value={
                        editingSelectedDiscrepancy
                          ? selectedDiscrepancyForm.ata_code
                          : selectedDiscrepancy.ata_code || "—"
                      }
                      onChange={(e) => updateSelectedDiscrepancyForm("ata_code", e.target.value)}
                      InputProps={{ readOnly: !editingSelectedDiscrepancy }}
                    />
                    <TextField
                      label="Tach time"
                      size="small"
                      fullWidth
                      value={
                        editingSelectedDiscrepancy
                          ? selectedDiscrepancyForm.tach_time
                          : selectedDiscrepancy.tach_time || "—"
                      }
                      onChange={(e) => updateSelectedDiscrepancyForm("tach_time", e.target.value)}
                      InputProps={{ readOnly: !editingSelectedDiscrepancy }}
                    />
                  </Stack>
                  <TextField
                    label="Description"
                    size="small"
                    fullWidth
                    multiline
                    minRows={3}
                    value={
                      editingSelectedDiscrepancy
                        ? selectedDiscrepancyForm.description
                        : selectedDiscrepancy.description || "—"
                    }
                    onChange={(e) => updateSelectedDiscrepancyForm("description", e.target.value)}
                    InputProps={{ readOnly: !editingSelectedDiscrepancy }}
                  />
                  {editingSelectedDiscrepancy && selectedDiscrepancyChangedFields.length > 0 ? (
                    <Alert severity="info">
                      Edited fields: {selectedDiscrepancyChangedFields.join(", ")}. Last change:{" "}
                      {formatEditedAt(selectedDiscrepancyEditedAt)}
                    </Alert>
                  ) : null}
                  {!editingSelectedDiscrepancy && selectedDiscrepancySavedTrail.length > 0 ? (
                    <Alert severity="info">
                      Last saved edit by{" "}
                      {resolveTrailEditorName(
                        selectedDiscrepancySavedTrail[
                          selectedDiscrepancySavedTrail.length - 1
                        ],
                        pilotNameById
                      )}
                      :{" "}
                      {selectedDiscrepancySavedTrail[
                        selectedDiscrepancySavedTrail.length - 1
                      ].fields.join(", ")}{" "}
                      on{" "}
                      {formatEditedAt(
                        selectedDiscrepancySavedTrail[
                          selectedDiscrepancySavedTrail.length - 1
                        ].editedAt
                      )}
                    </Alert>
                  ) : null}
                  {!editingSelectedDiscrepancy && selectedDiscrepancySavedTrail.length > 0 ? (
                    <Box
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1.5,
                        p: 1.5,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Edit history
                      </Typography>
                      <Stack spacing={1}>
                        {[...selectedDiscrepancySavedTrail]
                          .slice(-10)
                          .reverse()
                          .map((entry, idx) => (
                            <Box
                              key={`${entry.editedAt}-${idx}`}
                              sx={{ p: 1, borderRadius: 1, bgcolor: "action.hover" }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {resolveTrailEditorName(entry, pilotNameById)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {formatEditedAt(entry.editedAt)}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
                                Changed: {Array.isArray(entry.fields) ? entry.fields.join(", ") : "—"}
                              </Typography>
                            </Box>
                          ))}
                      </Stack>
                    </Box>
                  ) : null}
                </Stack>
              ) : null}
            </DialogContent>
            <DialogActions>
              {editingSelectedDiscrepancy ? (
                <>
                  <Button
                    onClick={() => setEditingSelectedDiscrepancy(false)}
                    disabled={savingSelectedDiscrepancy}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={saveSelectedDiscrepancyEdit}
                    disabled={savingSelectedDiscrepancy}
                  >
                    {savingSelectedDiscrepancy ? "Saving…" : "Save changes"}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={closeDiscrepancyDetails}>Close</Button>
                  {canEditSelectedDiscrepancy ? (
                    <Button variant="contained" onClick={() => setEditingSelectedDiscrepancy(true)}>
                      Edit discrepancy
                    </Button>
                  ) : null}
                </>
              )}
            </DialogActions>
          </Dialog>
        </Stack>
      </Container>
    </Box>
  );
}
