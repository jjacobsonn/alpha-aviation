import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Stack,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import { useEffect, useMemo, useState } from "react";
import {
  createCompany,
  createAircraft,
  createDiscrepancy,
  fetchDiscrepancies,
  createFlight,
  createInventory,
  createPart,
  createProfile,
  createWorkorder,
  deleteAircraft,
  deleteDiscrepancy,
  deleteInventory,
  deletePart,
  deleteProfile,
  deleteFlight,
  deleteWorkorder,
  fetchAircraft,
  fetchCompanies,
  fetchFlights,
  fetchInventories,
  fetchParts,
  fetchProfiles,
  fetchWorkorders,
  updateAircraft,
  updateDiscrepancy,
  updateFlight,
  updateInventory,
  updatePart,
  updateProfile,
  updateWorkorder,
} from "../shared/Api";

export default function SiteAdminPortal() {
  const [companies, setCompanies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [flights, setFlights] = useState([]);
  const [parts, setParts] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [workorders, setWorkorders] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyLocation, setNewCompanyLocation] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [createAircraftOpen, setCreateAircraftOpen] = useState(false);
  const [editAircraftOpen, setEditAircraftOpen] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [creatingAircraft, setCreatingAircraft] = useState(false);
  const [savingAircraft, setSavingAircraft] = useState(false);
  const [newAircraftForm, setNewAircraftForm] = useState({
    registration_number: "",
    model: "",
    manufacturer: "",
    engine_type: "",
    year_built: "",
    company: "",
  });
  const [createFlightOpen, setCreateFlightOpen] = useState(false);
  const [editFlightOpen, setEditFlightOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [creatingFlight, setCreatingFlight] = useState(false);
  const [savingFlight, setSavingFlight] = useState(false);
  const [newFlightForm, setNewFlightForm] = useState({
    company: "",
    aircraft: "",
    flight_number: "",
    origin: "",
    destination: "",
    departure_time: "",
    arrival_time: "",
    route: "",
    flight_type: "",
    primary_pilot: "",
    secondary_pilot: "",
    pilot_requirement: "none",
    approved: false,
  });
  const [editFlightForm, setEditFlightForm] = useState({
    company: "",
    aircraft: "",
    flight_number: "",
    origin: "",
    destination: "",
    departure_time: "",
    arrival_time: "",
    route: "",
    flight_type: "",
    primary_pilot: "",
    secondary_pilot: "",
    pilot_requirement: "none",
    approved: false,
  });
  const [editAircraftForm, setEditAircraftForm] = useState({
    registration_number: "",
    model: "",
    manufacturer: "",
    engine_type: "",
    year_built: "",
    company: "",
  });
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    company: "",
    company_role: "pilot",
  });
  const [editUserForm, setEditUserForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    company: "",
    company_role: "pilot",
    password: "",
  });
  const [createPartOpen, setCreatePartOpen] = useState(false);
  const [editPartOpen, setEditPartOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [partForm, setPartForm] = useState({
    part_number: "",
    name: "",
    description: "",
    aircraft: "",
  });
  const [createInventoryOpen, setCreateInventoryOpen] = useState(false);
  const [editInventoryOpen, setEditInventoryOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [inventoryForm, setInventoryForm] = useState({
    company: "",
    part_id: "",
    in_stock: "",
    stock_alert: "",
    stock_alert_percentage: "0.1",
    shop_location: "",
  });
  const [createWorkorderOpen, setCreateWorkorderOpen] = useState(false);
  const [editWorkorderOpen, setEditWorkorderOpen] = useState(false);
  const [selectedWorkorder, setSelectedWorkorder] = useState(null);
  const [workorderForm, setWorkorderForm] = useState({
    title: "",
    aircraft: "",
    description: "",
    status: "open",
    due_by: "",
  });
  const [createDiscrepancyOpen, setCreateDiscrepancyOpen] = useState(false);
  const [editDiscrepancyOpen, setEditDiscrepancyOpen] = useState(false);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState(null);
  const [discrepancyForm, setDiscrepancyForm] = useState({
    aircraft: "",
    reporter: "",
    description: "",
    ata_code: "",
    tach_time: "",
    status: "pending",
  });

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [
        companyData,
        profileData,
        aircraftData,
        flightData,
        partData,
        inventoryData,
        workorderData,
        discrepancyData,
      ] = await Promise.all([
        fetchCompanies(),
        fetchProfiles(),
        fetchAircraft(),
        fetchFlights(),
        fetchParts(),
        fetchInventories(),
        fetchWorkorders(),
        fetchDiscrepancies(),
      ]);
      setCompanies(Array.isArray(companyData) ? companyData : []);
      setProfiles(Array.isArray(profileData) ? profileData : []);
      setAircraft(Array.isArray(aircraftData) ? aircraftData : []);
      setFlights(Array.isArray(flightData) ? flightData : []);
      setParts(Array.isArray(partData) ? partData : []);
      setInventories(Array.isArray(inventoryData) ? inventoryData : []);
      setWorkorders(Array.isArray(workorderData) ? workorderData : []);
      setDiscrepancies(Array.isArray(discrepancyData) ? discrepancyData : []);
    } catch (e) {
      setError(e?.message || "Failed to load site-admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const userCountByCompany = useMemo(() => {
    const map = new Map();
    profiles.forEach((u) => {
      const key = u?.company;
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [profiles]);

  const aircraftCountByCompany = useMemo(() => {
    const map = new Map();
    aircraft.forEach((a) => {
      const key = a?.company;
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [aircraft]);

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      setError("Company name is required.");
      return;
    }
    setCreatingCompany(true);
    setError("");
    try {
      await createCompany({
        name: newCompanyName.trim(),
        locations: newCompanyLocation.trim(),
      });
      setNewCompanyName("");
      setNewCompanyLocation("");
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to create company.");
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleOpenEditUser = (user) => {
    setSelectedUser(user);
    setEditUserForm({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
      company: user?.company || "",
      company_role: user?.company_role || "pilot",
      password: "",
    });
    setEditUserOpen(true);
  };

  const handleOpenCreateUser = (companyId = "") => {
    setError("");
    setNewUserForm({
      username: "",
      password: "",
      first_name: "",
      last_name: "",
      email: "",
      company: companyId ? String(companyId) : "",
      company_role: "pilot",
    });
    setCreateUserOpen(true);
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username.trim()) {
      setError("Username is required.");
      return;
    }
    setCreatingUser(true);
    setError("");
    try {
      const payload = {
        ...newUserForm,
        username: newUserForm.username.trim(),
        company: newUserForm.company ? Number(newUserForm.company) : null,
      };
      await createProfile(payload);
      setCreateUserOpen(false);
      setNewUserForm({
        username: "",
        password: "",
        first_name: "",
        last_name: "",
        email: "",
        company: "",
        company_role: "pilot",
      });
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to create user.");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUser?.id) return;
    setSavingUser(true);
    setError("");
    try {
      await updateProfile(selectedUser.id, {
        ...editUserForm,
        company: editUserForm.company ? Number(editUserForm.company) : null,
      });
      setEditUserOpen(false);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to update user.");
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (id) => {
    setError("");
    try {
      await deleteProfile(id);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to delete user.");
    }
  };

  const pilotOptionsForCompany = (companyId) =>
    profiles.filter(
      (p) =>
        p?.company_role === "pilot" &&
        Number(p?.company || 0) === Number(companyId || 0)
    );

  const handleOpenEditAircraft = (a) => {
    setSelectedAircraft(a);
    setEditAircraftForm({
      registration_number: a?.registration_number || "",
      model: a?.model || "",
      manufacturer: a?.manufacturer || "",
      engine_type: a?.engine_type || "",
      year_built: a?.year_built || "",
      company: a?.company || "",
    });
    setEditAircraftOpen(true);
  };

  const handleCreateAircraft = async () => {
    if (!newAircraftForm.registration_number || !newAircraftForm.model) {
      setError("Aircraft registration number and model are required.");
      return;
    }
    setCreatingAircraft(true);
    setError("");
    try {
      await createAircraft({
        ...newAircraftForm,
        year_built: newAircraftForm.year_built ? Number(newAircraftForm.year_built) : null,
        company: newAircraftForm.company ? Number(newAircraftForm.company) : null,
      });
      setCreateAircraftOpen(false);
      setNewAircraftForm({
        registration_number: "",
        model: "",
        manufacturer: "",
        engine_type: "",
        year_built: "",
        company: "",
      });
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to create aircraft.");
    } finally {
      setCreatingAircraft(false);
    }
  };

  const handleSaveAircraft = async () => {
    if (!selectedAircraft?.id) return;
    setSavingAircraft(true);
    setError("");
    try {
      await updateAircraft(selectedAircraft.id, {
        ...editAircraftForm,
        year_built: editAircraftForm.year_built ? Number(editAircraftForm.year_built) : null,
        company: editAircraftForm.company ? Number(editAircraftForm.company) : null,
      });
      setEditAircraftOpen(false);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to update aircraft.");
    } finally {
      setSavingAircraft(false);
    }
  };

  const handleDeleteAircraft = async (id) => {
    setError("");
    try {
      await deleteAircraft(id);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to delete aircraft.");
    }
  };

  const handleOpenEditFlight = (f) => {
    setSelectedFlight(f);
    setEditFlightForm({
      company: f?.company || "",
      aircraft: f?.aircraft || "",
      flight_number: f?.flight_number || "",
      origin: f?.origin || "",
      destination: f?.destination || "",
      departure_time: f?.departure_time || "",
      arrival_time: f?.arrival_time || "",
      route: f?.route || "",
      flight_type: f?.flight_type || "",
      primary_pilot: f?.primary_pilot || "",
      secondary_pilot: f?.secondary_pilot || "",
      pilot_requirement: f?.pilot_requirement || "none",
      approved: Boolean(f?.approved),
    });
    setEditFlightOpen(true);
  };

  const normalizeFlightPayload = (form) => ({
    company: form.company ? Number(form.company) : null,
    aircraft: form.aircraft ? Number(form.aircraft) : null,
    flight_number: form.flight_number,
    origin: form.origin,
    destination: form.destination,
    departure_time: form.departure_time,
    arrival_time: form.arrival_time,
    route: form.route,
    flight_type: form.flight_type,
    primary_pilot: form.primary_pilot ? Number(form.primary_pilot) : null,
    secondary_pilot: form.secondary_pilot ? Number(form.secondary_pilot) : null,
    pilot_requirement: form.pilot_requirement || "none",
    approved: Boolean(form.approved),
  });

  const handleCreateFlight = async () => {
    if (!newFlightForm.flight_number || !newFlightForm.aircraft || !newFlightForm.company) {
      setError("Flight number, company, and aircraft are required.");
      return;
    }
    setCreatingFlight(true);
    setError("");
    try {
      await createFlight(normalizeFlightPayload(newFlightForm));
      setCreateFlightOpen(false);
      setNewFlightForm({
        company: "",
        aircraft: "",
        flight_number: "",
        origin: "",
        destination: "",
        departure_time: "",
        arrival_time: "",
        route: "",
        flight_type: "",
        primary_pilot: "",
        secondary_pilot: "",
        pilot_requirement: "none",
        approved: false,
      });
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to create flight.");
    } finally {
      setCreatingFlight(false);
    }
  };

  const handleSaveFlight = async () => {
    if (!selectedFlight?.id) return;
    setSavingFlight(true);
    setError("");
    try {
      await updateFlight(selectedFlight.id, normalizeFlightPayload(editFlightForm));
      setEditFlightOpen(false);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to update flight.");
    } finally {
      setSavingFlight(false);
    }
  };

  const handleDeleteFlight = async (id) => {
    setError("");
    try {
      await deleteFlight(id);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to delete flight.");
    }
  };

  const handleOpenCreatePart = () => {
    setPartForm({ part_number: "", name: "", description: "", aircraft: "" });
    setCreatePartOpen(true);
  };

  const handleCreatePart = async () => {
    try {
      await createPart({
        ...partForm,
        aircraft: Number(partForm.aircraft),
      });
      setCreatePartOpen(false);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to create part.");
    }
  };

  const handleOpenEditPart = (p) => {
    setSelectedPart(p);
    setPartForm({
      part_number: p?.part_number || "",
      name: p?.name || "",
      description: p?.description || "",
      aircraft: p?.aircraft || "",
    });
    setEditPartOpen(true);
  };

  const handleEditPart = async () => {
    if (!selectedPart?.id) return;
    try {
      await updatePart(selectedPart.id, {
        ...partForm,
        aircraft: Number(partForm.aircraft),
      });
      setEditPartOpen(false);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to update part.");
    }
  };

  const handleDeletePart = async (id) => {
    try {
      await deletePart(id);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to delete part.");
    }
  };

  const handleOpenCreateInventoryLine = () => {
    setInventoryForm({
      company: "",
      part_id: "",
      in_stock: "",
      stock_alert: "",
      stock_alert_percentage: "0.1",
      shop_location: "",
    });
    setCreateInventoryOpen(true);
  };

  const handleCreateInventoryLine = async () => {
    try {
      await createInventory({
        company: Number(inventoryForm.company),
        part_id: Number(inventoryForm.part_id),
        in_stock: Number(inventoryForm.in_stock),
        stock_alert: Number(inventoryForm.stock_alert),
        stock_alert_percentage: Number(inventoryForm.stock_alert_percentage),
        shop_location: inventoryForm.shop_location,
      });
      setCreateInventoryOpen(false);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to create inventory line.");
    }
  };

  const handleOpenEditInventoryLine = (inv) => {
    setSelectedInventory(inv);
    setInventoryForm({
      company: inv?.company?.id || "",
      part_id: inv?.part?.id || "",
      in_stock: String(inv?.in_stock ?? ""),
      stock_alert: String(inv?.stock_alert ?? ""),
      stock_alert_percentage: String(inv?.stock_alert_percentage ?? "0.1"),
      shop_location: inv?.shop_location || "",
    });
    setEditInventoryOpen(true);
  };

  const handleEditInventoryLine = async () => {
    if (!selectedInventory?.id) return;
    try {
      await updateInventory(selectedInventory.id, {
        part_id: Number(inventoryForm.part_id),
        in_stock: Number(inventoryForm.in_stock),
        stock_alert: Number(inventoryForm.stock_alert),
        stock_alert_percentage: Number(inventoryForm.stock_alert_percentage),
        shop_location: inventoryForm.shop_location,
      });
      setEditInventoryOpen(false);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to update inventory line.");
    }
  };

  const handleDeleteInventoryLine = async (id) => {
    try {
      await deleteInventory(id);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to delete inventory line.");
    }
  };

  const handleOpenCreateWorkorder = () => {
    setWorkorderForm({
      title: "",
      aircraft: "",
      description: "",
      status: "open",
      due_by: "",
    });
    setCreateWorkorderOpen(true);
  };

  const handleCreateWorkorder = async () => {
    try {
      await createWorkorder({
        ...workorderForm,
        aircraft: Number(workorderForm.aircraft),
      });
      setCreateWorkorderOpen(false);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to create work order.");
    }
  };

  const handleOpenEditWorkorder = (wo) => {
    setSelectedWorkorder(wo);
    setWorkorderForm({
      title: wo?.title || "",
      aircraft: wo?.aircraft || "",
      description: wo?.description || "",
      status: wo?.status || "open",
      due_by: wo?.due_by || "",
    });
    setEditWorkorderOpen(true);
  };

  const handleEditWorkorder = async () => {
    if (!selectedWorkorder?.id) return;
    try {
      await updateWorkorder(selectedWorkorder.id, {
        ...workorderForm,
        aircraft: Number(workorderForm.aircraft),
      });
      setEditWorkorderOpen(false);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to update work order.");
    }
  };

  const handleDeleteWorkorder = async (id) => {
    try {
      await deleteWorkorder(id);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to delete work order.");
    }
  };

  const handleOpenCreateDiscrepancy = () => {
    setDiscrepancyForm({
      aircraft: "",
      reporter: "",
      description: "",
      ata_code: "",
      tach_time: "",
      status: "pending",
    });
    setCreateDiscrepancyOpen(true);
  };

  const handleCreateDiscrepancy = async () => {
    try {
      await createDiscrepancy({
        ...discrepancyForm,
        aircraft: Number(discrepancyForm.aircraft),
        reporter: Number(discrepancyForm.reporter),
      });
      setCreateDiscrepancyOpen(false);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to create discrepancy.");
    }
  };

  const handleOpenEditDiscrepancy = (d) => {
    setSelectedDiscrepancy(d);
    setDiscrepancyForm({
      aircraft: d?.aircraft || "",
      reporter: d?.reporter || "",
      description: d?.description || "",
      ata_code: d?.ata_code || "",
      tach_time: d?.tach_time || "",
      status: d?.status || "pending",
    });
    setEditDiscrepancyOpen(true);
  };

  const handleEditDiscrepancy = async () => {
    if (!selectedDiscrepancy?.id) return;
    try {
      await updateDiscrepancy(selectedDiscrepancy.id, discrepancyForm);
      setEditDiscrepancyOpen(false);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to update discrepancy.");
    }
  };

  const handleDeleteDiscrepancy = async (id) => {
    try {
      await deleteDiscrepancy(id);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to delete discrepancy.");
    }
  };

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Site Admin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Global administration workspace connected to backend APIs.
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Companies
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {loading ? "—" : companies.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Profiles
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {loading ? "—" : profiles.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Aircraft
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {loading ? "—" : aircraft.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Flights
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {loading ? "—" : flights.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Parts
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {loading ? "—" : parts.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Inventory Lines
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {loading ? "—" : inventories.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Work Orders
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {loading ? "—" : workorders.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Discrepancies
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {loading ? "—" : discrepancies.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", mb: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Create Company
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Company Name"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Locations"
                  value={newCompanyLocation}
                  onChange={(e) => setNewCompanyLocation(e.target.value)}
                  fullWidth
                />
                <Button
                  variant="contained"
                  onClick={handleCreateCompany}
                  disabled={creatingCompany}
                >
                  {creatingCompany ? "Creating..." : "Create"}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Companies
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Locations</TableCell>
                    <TableCell>Users</TableCell>
                    <TableCell>Aircraft</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.locations || "—"}</TableCell>
                      <TableCell>{userCountByCompany.get(c.id) || 0}</TableCell>
                      <TableCell>{aircraftCountByCompany.get(c.id) || 0}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          aria-label={`Add user to ${c.name}`}
                          onClick={() => handleOpenCreateUser(c.id)}
                        >
                          <PersonAddAltIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  endIcon={<OpenInNewIcon />}
                  onClick={() => window.open("http://localhost:8000/admin/", "_blank")}
                >
                  Open Django Admin
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", mt: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Users
                </Typography>
                <Button variant="contained" onClick={() => handleOpenCreateUser()}>
                  Create User
                </Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {profiles.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{`${u.first_name || ""} ${u.last_name || ""}`.trim() || "—"}</TableCell>
                      <TableCell>{u.email || "—"}</TableCell>
                      <TableCell>{u.platform_role || u.company_role || "—"}</TableCell>
                      <TableCell>
                        {companies.find((c) => Number(c.id) === Number(u.company))?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => handleOpenEditUser(u)}>
                          Edit
                        </Button>
                        <Button size="small" color="error" onClick={() => handleDeleteUser(u.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", mt: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Aircraft
                </Typography>
                <Button variant="contained" onClick={() => setCreateAircraftOpen(true)}>
                  Create Aircraft
                </Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Registration</TableCell>
                    <TableCell>Model</TableCell>
                    <TableCell>Manufacturer</TableCell>
                    <TableCell>Engine</TableCell>
                    <TableCell>Year</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aircraft.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.registration_number}</TableCell>
                      <TableCell>{a.model || "—"}</TableCell>
                      <TableCell>{a.manufacturer || "—"}</TableCell>
                      <TableCell>{a.engine_type || "—"}</TableCell>
                      <TableCell>{a.year_built || "—"}</TableCell>
                      <TableCell>
                        {companies.find((c) => Number(c.id) === Number(a.company))?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" onClick={() => handleOpenEditAircraft(a)}>
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDeleteAircraft(a.id)}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", mt: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Flights
                </Typography>
                <Button variant="contained" onClick={() => setCreateFlightOpen(true)}>
                  Create Flight
                </Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Flight #</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Aircraft</TableCell>
                    <TableCell>Origin</TableCell>
                    <TableCell>Destination</TableCell>
                    <TableCell>Departure</TableCell>
                    <TableCell>Approved</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flights.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.flight_number || "—"}</TableCell>
                      <TableCell>
                        {companies.find((c) => Number(c.id) === Number(f.company))?.name || "—"}
                      </TableCell>
                      <TableCell>
                        {aircraft.find((a) => Number(a.id) === Number(f.aircraft))?.registration_number ||
                          f.aircraft_name ||
                          "—"}
                      </TableCell>
                      <TableCell>{f.origin || "—"}</TableCell>
                      <TableCell>{f.destination || "—"}</TableCell>
                      <TableCell>{f.departure_time || "—"}</TableCell>
                      <TableCell>{f.approved ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" onClick={() => handleOpenEditFlight(f)}>
                            Edit
                          </Button>
                          <Button size="small" color="error" onClick={() => handleDeleteFlight(f.id)}>
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", mt: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Parts
              </Typography>
              <Stack direction="row" justifyContent="flex-end">
                <Button variant="contained" onClick={handleOpenCreatePart}>
                  Create Part
                </Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>P/N</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Aircraft</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parts.slice(0, 20).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.part_number || "—"}</TableCell>
                      <TableCell>{p.name || "—"}</TableCell>
                      <TableCell>{p.aircraft_name || p.aircraft || "—"}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => handleOpenEditPart(p)}>Edit</Button>
                        <Button size="small" color="error" onClick={() => handleDeletePart(p.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", mt: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Inventory Lines
              </Typography>
              <Stack direction="row" justifyContent="flex-end">
                <Button variant="contained" onClick={handleOpenCreateInventoryLine}>
                  Add Inventory Line
                </Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell>Part</TableCell>
                    <TableCell>In Stock</TableCell>
                    <TableCell>Stock Alert</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inventories.slice(0, 30).map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv?.company?.name || "—"}</TableCell>
                      <TableCell>{inv?.part?.part_number || inv?.part?.name || "—"}</TableCell>
                      <TableCell>{inv?.in_stock ?? "—"}</TableCell>
                      <TableCell>{inv?.stock_alert ?? "—"}</TableCell>
                      <TableCell>{inv?.shop_location || "—"}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => handleOpenEditInventoryLine(inv)}>Edit</Button>
                        <Button size="small" color="error" onClick={() => handleDeleteInventoryLine(inv.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", mt: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Work Orders
              </Typography>
              <Stack direction="row" justifyContent="flex-end">
                <Button variant="contained" onClick={handleOpenCreateWorkorder}>
                  Create Work Order
                </Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Aircraft</TableCell>
                    <TableCell>Due</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workorders.slice(0, 20).map((wo) => (
                    <TableRow key={wo.id}>
                      <TableCell>{wo.id}</TableCell>
                      <TableCell>{wo.title || "—"}</TableCell>
                      <TableCell>{wo.status || "—"}</TableCell>
                      <TableCell>{wo.aircraft || "—"}</TableCell>
                      <TableCell>{wo.due_by || "—"}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => handleOpenEditWorkorder(wo)}>Edit</Button>
                        <Button size="small" color="error" onClick={() => handleDeleteWorkorder(wo.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", mt: 3, mb: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Discrepancies
              </Typography>
              <Stack direction="row" justifyContent="flex-end">
                <Button variant="contained" onClick={handleOpenCreateDiscrepancy}>
                  Create Discrepancy
                </Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>ATA</TableCell>
                    <TableCell>Aircraft</TableCell>
                    <TableCell>Reporter</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {discrepancies.slice(0, 20).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.id}</TableCell>
                      <TableCell>{d.status || "—"}</TableCell>
                      <TableCell>{d.ata_code || "—"}</TableCell>
                      <TableCell>{d.aircraft || "—"}</TableCell>
                      <TableCell>{d.reporter_name || d.reporter || "—"}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => handleOpenEditDiscrepancy(d)}>Edit</Button>
                        <Button size="small" color="error" onClick={() => handleDeleteDiscrepancy(d.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </CardContent>
        </Card>
      </Container>

      <Dialog open={createUserOpen} onClose={() => setCreateUserOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Username" value={newUserForm.username} onChange={(e) => setNewUserForm((s) => ({ ...s, username: e.target.value }))} />
            <TextField label="Password" type="password" value={newUserForm.password} onChange={(e) => setNewUserForm((s) => ({ ...s, password: e.target.value }))} />
            <TextField label="First Name" value={newUserForm.first_name} onChange={(e) => setNewUserForm((s) => ({ ...s, first_name: e.target.value }))} />
            <TextField label="Last Name" value={newUserForm.last_name} onChange={(e) => setNewUserForm((s) => ({ ...s, last_name: e.target.value }))} />
            <TextField label="Email" value={newUserForm.email} onChange={(e) => setNewUserForm((s) => ({ ...s, email: e.target.value }))} />
            <TextField select label="Role" value={newUserForm.company_role} onChange={(e) => setNewUserForm((s) => ({ ...s, company_role: e.target.value }))}>
              {["owner", "manager", "mechanic", "pilot", "dispatcher"].map((r) => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Company" value={newUserForm.company} onChange={(e) => setNewUserForm((s) => ({ ...s, company: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateUserOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateUser} disabled={creatingUser}>
            {creatingUser ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editUserOpen} onClose={() => setEditUserOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="First Name" value={editUserForm.first_name} onChange={(e) => setEditUserForm((s) => ({ ...s, first_name: e.target.value }))} />
            <TextField label="Last Name" value={editUserForm.last_name} onChange={(e) => setEditUserForm((s) => ({ ...s, last_name: e.target.value }))} />
            <TextField label="Email" value={editUserForm.email} onChange={(e) => setEditUserForm((s) => ({ ...s, email: e.target.value }))} />
            <TextField label="Reset Password (optional)" type="password" value={editUserForm.password} onChange={(e) => setEditUserForm((s) => ({ ...s, password: e.target.value }))} />
            <TextField select label="Role" value={editUserForm.company_role} onChange={(e) => setEditUserForm((s) => ({ ...s, company_role: e.target.value }))}>
              {["owner", "manager", "mechanic", "pilot", "dispatcher"].map((r) => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Company" value={editUserForm.company} onChange={(e) => setEditUserForm((s) => ({ ...s, company: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser} disabled={savingUser}>
            {savingUser ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createAircraftOpen} onClose={() => setCreateAircraftOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Aircraft</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Registration Number" value={newAircraftForm.registration_number} onChange={(e) => setNewAircraftForm((s) => ({ ...s, registration_number: e.target.value }))} />
            <TextField label="Model" value={newAircraftForm.model} onChange={(e) => setNewAircraftForm((s) => ({ ...s, model: e.target.value }))} />
            <TextField label="Manufacturer" value={newAircraftForm.manufacturer} onChange={(e) => setNewAircraftForm((s) => ({ ...s, manufacturer: e.target.value }))} />
            <TextField label="Engine Type" value={newAircraftForm.engine_type} onChange={(e) => setNewAircraftForm((s) => ({ ...s, engine_type: e.target.value }))} />
            <TextField label="Year Built" type="number" value={newAircraftForm.year_built} onChange={(e) => setNewAircraftForm((s) => ({ ...s, year_built: e.target.value }))} />
            <TextField select label="Company" value={newAircraftForm.company} onChange={(e) => setNewAircraftForm((s) => ({ ...s, company: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateAircraftOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateAircraft} disabled={creatingAircraft}>
            {creatingAircraft ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editAircraftOpen} onClose={() => setEditAircraftOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Aircraft</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Registration Number" value={editAircraftForm.registration_number} onChange={(e) => setEditAircraftForm((s) => ({ ...s, registration_number: e.target.value }))} />
            <TextField label="Model" value={editAircraftForm.model} onChange={(e) => setEditAircraftForm((s) => ({ ...s, model: e.target.value }))} />
            <TextField label="Manufacturer" value={editAircraftForm.manufacturer} onChange={(e) => setEditAircraftForm((s) => ({ ...s, manufacturer: e.target.value }))} />
            <TextField label="Engine Type" value={editAircraftForm.engine_type} onChange={(e) => setEditAircraftForm((s) => ({ ...s, engine_type: e.target.value }))} />
            <TextField label="Year Built" type="number" value={editAircraftForm.year_built} onChange={(e) => setEditAircraftForm((s) => ({ ...s, year_built: e.target.value }))} />
            <TextField select label="Company" value={editAircraftForm.company} onChange={(e) => setEditAircraftForm((s) => ({ ...s, company: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAircraftOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAircraft} disabled={savingAircraft}>
            {savingAircraft ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createFlightOpen} onClose={() => setCreateFlightOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Flight</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Flight Number" value={newFlightForm.flight_number} onChange={(e) => setNewFlightForm((s) => ({ ...s, flight_number: e.target.value }))} />
            <TextField select label="Company" value={newFlightForm.company} onChange={(e) => setNewFlightForm((s) => ({ ...s, company: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {companies.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <TextField select label="Aircraft" value={newFlightForm.aircraft} onChange={(e) => setNewFlightForm((s) => ({ ...s, aircraft: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {aircraft.map((a) => <MenuItem key={a.id} value={a.id}>{a.registration_number} ({a.model})</MenuItem>)}
            </TextField>
            <TextField label="Origin" value={newFlightForm.origin} onChange={(e) => setNewFlightForm((s) => ({ ...s, origin: e.target.value }))} />
            <TextField label="Destination" value={newFlightForm.destination} onChange={(e) => setNewFlightForm((s) => ({ ...s, destination: e.target.value }))} />
            <TextField type="datetime-local" label="Departure Time" InputLabelProps={{ shrink: true }} value={newFlightForm.departure_time} onChange={(e) => setNewFlightForm((s) => ({ ...s, departure_time: e.target.value }))} />
            <TextField type="datetime-local" label="Arrival Time" InputLabelProps={{ shrink: true }} value={newFlightForm.arrival_time} onChange={(e) => setNewFlightForm((s) => ({ ...s, arrival_time: e.target.value }))} />
            <TextField label="Route" value={newFlightForm.route} onChange={(e) => setNewFlightForm((s) => ({ ...s, route: e.target.value }))} />
            <TextField label="Flight Type" value={newFlightForm.flight_type} onChange={(e) => setNewFlightForm((s) => ({ ...s, flight_type: e.target.value }))} />
            <TextField select label="Primary Pilot" value={newFlightForm.primary_pilot} onChange={(e) => setNewFlightForm((s) => ({ ...s, primary_pilot: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {pilotOptionsForCompany(newFlightForm.company).map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.username}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Secondary Pilot" value={newFlightForm.secondary_pilot} onChange={(e) => setNewFlightForm((s) => ({ ...s, secondary_pilot: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {pilotOptionsForCompany(newFlightForm.company).map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.username}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFlightOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateFlight} disabled={creatingFlight}>
            {creatingFlight ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editFlightOpen} onClose={() => setEditFlightOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Flight</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Flight Number" value={editFlightForm.flight_number} onChange={(e) => setEditFlightForm((s) => ({ ...s, flight_number: e.target.value }))} />
            <TextField select label="Company" value={editFlightForm.company} onChange={(e) => setEditFlightForm((s) => ({ ...s, company: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {companies.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <TextField select label="Aircraft" value={editFlightForm.aircraft} onChange={(e) => setEditFlightForm((s) => ({ ...s, aircraft: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {aircraft.map((a) => <MenuItem key={a.id} value={a.id}>{a.registration_number} ({a.model})</MenuItem>)}
            </TextField>
            <TextField label="Origin" value={editFlightForm.origin} onChange={(e) => setEditFlightForm((s) => ({ ...s, origin: e.target.value }))} />
            <TextField label="Destination" value={editFlightForm.destination} onChange={(e) => setEditFlightForm((s) => ({ ...s, destination: e.target.value }))} />
            <TextField type="datetime-local" label="Departure Time" InputLabelProps={{ shrink: true }} value={editFlightForm.departure_time} onChange={(e) => setEditFlightForm((s) => ({ ...s, departure_time: e.target.value }))} />
            <TextField type="datetime-local" label="Arrival Time" InputLabelProps={{ shrink: true }} value={editFlightForm.arrival_time} onChange={(e) => setEditFlightForm((s) => ({ ...s, arrival_time: e.target.value }))} />
            <TextField label="Route" value={editFlightForm.route} onChange={(e) => setEditFlightForm((s) => ({ ...s, route: e.target.value }))} />
            <TextField label="Flight Type" value={editFlightForm.flight_type} onChange={(e) => setEditFlightForm((s) => ({ ...s, flight_type: e.target.value }))} />
            <TextField select label="Primary Pilot" value={editFlightForm.primary_pilot} onChange={(e) => setEditFlightForm((s) => ({ ...s, primary_pilot: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {pilotOptionsForCompany(editFlightForm.company).map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.username}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Secondary Pilot" value={editFlightForm.secondary_pilot} onChange={(e) => setEditFlightForm((s) => ({ ...s, secondary_pilot: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {pilotOptionsForCompany(editFlightForm.company).map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.username}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditFlightOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveFlight} disabled={savingFlight}>
            {savingFlight ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createPartOpen} onClose={() => setCreatePartOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Part</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Part Number" value={partForm.part_number} onChange={(e) => setPartForm((s) => ({ ...s, part_number: e.target.value }))} />
            <TextField label="Name" value={partForm.name} onChange={(e) => setPartForm((s) => ({ ...s, name: e.target.value }))} />
            <TextField label="Description" value={partForm.description} onChange={(e) => setPartForm((s) => ({ ...s, description: e.target.value }))} />
            <TextField select label="Aircraft" value={partForm.aircraft} onChange={(e) => setPartForm((s) => ({ ...s, aircraft: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {aircraft.map((a) => <MenuItem key={a.id} value={a.id}>{a.registration_number} ({a.model})</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePartOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreatePart}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editPartOpen} onClose={() => setEditPartOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Part</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Part Number" value={partForm.part_number} onChange={(e) => setPartForm((s) => ({ ...s, part_number: e.target.value }))} />
            <TextField label="Name" value={partForm.name} onChange={(e) => setPartForm((s) => ({ ...s, name: e.target.value }))} />
            <TextField label="Description" value={partForm.description} onChange={(e) => setPartForm((s) => ({ ...s, description: e.target.value }))} />
            <TextField select label="Aircraft" value={partForm.aircraft} onChange={(e) => setPartForm((s) => ({ ...s, aircraft: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {aircraft.map((a) => <MenuItem key={a.id} value={a.id}>{a.registration_number} ({a.model})</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPartOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditPart}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createInventoryOpen} onClose={() => setCreateInventoryOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Inventory Line</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Company" value={inventoryForm.company} onChange={(e) => setInventoryForm((s) => ({ ...s, company: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {companies.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <TextField select label="Part" value={inventoryForm.part_id} onChange={(e) => setInventoryForm((s) => ({ ...s, part_id: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {parts.map((p) => <MenuItem key={p.id} value={p.id}>{p.part_number} - {p.name}</MenuItem>)}
            </TextField>
            <TextField label="In Stock" type="number" value={inventoryForm.in_stock} onChange={(e) => setInventoryForm((s) => ({ ...s, in_stock: e.target.value }))} />
            <TextField label="Stock Alert" type="number" value={inventoryForm.stock_alert} onChange={(e) => setInventoryForm((s) => ({ ...s, stock_alert: e.target.value }))} />
            <TextField label="Alert Percentage (0-1)" type="number" value={inventoryForm.stock_alert_percentage} onChange={(e) => setInventoryForm((s) => ({ ...s, stock_alert_percentage: e.target.value }))} />
            <TextField label="Shop Location" value={inventoryForm.shop_location} onChange={(e) => setInventoryForm((s) => ({ ...s, shop_location: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateInventoryOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateInventoryLine}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editInventoryOpen} onClose={() => setEditInventoryOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Inventory Line</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Part" value={inventoryForm.part_id} onChange={(e) => setInventoryForm((s) => ({ ...s, part_id: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {parts.map((p) => <MenuItem key={p.id} value={p.id}>{p.part_number} - {p.name}</MenuItem>)}
            </TextField>
            <TextField label="In Stock" type="number" value={inventoryForm.in_stock} onChange={(e) => setInventoryForm((s) => ({ ...s, in_stock: e.target.value }))} />
            <TextField label="Stock Alert" type="number" value={inventoryForm.stock_alert} onChange={(e) => setInventoryForm((s) => ({ ...s, stock_alert: e.target.value }))} />
            <TextField label="Alert Percentage (0-1)" type="number" value={inventoryForm.stock_alert_percentage} onChange={(e) => setInventoryForm((s) => ({ ...s, stock_alert_percentage: e.target.value }))} />
            <TextField label="Shop Location" value={inventoryForm.shop_location} onChange={(e) => setInventoryForm((s) => ({ ...s, shop_location: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditInventoryOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditInventoryLine}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createWorkorderOpen} onClose={() => setCreateWorkorderOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Work Order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={workorderForm.title} onChange={(e) => setWorkorderForm((s) => ({ ...s, title: e.target.value }))} />
            <TextField select label="Aircraft" value={workorderForm.aircraft} onChange={(e) => setWorkorderForm((s) => ({ ...s, aircraft: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {aircraft.map((a) => <MenuItem key={a.id} value={a.id}>{a.registration_number} ({a.model})</MenuItem>)}
            </TextField>
            <TextField label="Description" value={workorderForm.description} onChange={(e) => setWorkorderForm((s) => ({ ...s, description: e.target.value }))} />
            <TextField select label="Status" value={workorderForm.status} onChange={(e) => setWorkorderForm((s) => ({ ...s, status: e.target.value }))}>
              {["open","in_progress","awaiting_parts","closed"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField type="date" label="Due Date" InputLabelProps={{ shrink: true }} value={workorderForm.due_by} onChange={(e) => setWorkorderForm((s) => ({ ...s, due_by: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateWorkorderOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateWorkorder}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editWorkorderOpen} onClose={() => setEditWorkorderOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Work Order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={workorderForm.title} onChange={(e) => setWorkorderForm((s) => ({ ...s, title: e.target.value }))} />
            <TextField select label="Aircraft" value={workorderForm.aircraft} onChange={(e) => setWorkorderForm((s) => ({ ...s, aircraft: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {aircraft.map((a) => <MenuItem key={a.id} value={a.id}>{a.registration_number} ({a.model})</MenuItem>)}
            </TextField>
            <TextField label="Description" value={workorderForm.description} onChange={(e) => setWorkorderForm((s) => ({ ...s, description: e.target.value }))} />
            <TextField select label="Status" value={workorderForm.status} onChange={(e) => setWorkorderForm((s) => ({ ...s, status: e.target.value }))}>
              {["open","in_progress","awaiting_parts","closed"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField type="date" label="Due Date" InputLabelProps={{ shrink: true }} value={workorderForm.due_by} onChange={(e) => setWorkorderForm((s) => ({ ...s, due_by: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditWorkorderOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditWorkorder}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createDiscrepancyOpen} onClose={() => setCreateDiscrepancyOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Discrepancy</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Aircraft" value={discrepancyForm.aircraft} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, aircraft: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {aircraft.map((a) => <MenuItem key={a.id} value={a.id}>{a.registration_number} ({a.model})</MenuItem>)}
            </TextField>
            <TextField select label="Reporter" value={discrepancyForm.reporter} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, reporter: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {profiles.map((u) => <MenuItem key={u.id} value={u.id}>{u.username}</MenuItem>)}
            </TextField>
            <TextField label="Description" value={discrepancyForm.description} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, description: e.target.value }))} />
            <TextField label="ATA Code" value={discrepancyForm.ata_code} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, ata_code: e.target.value }))} />
            <TextField label="Tach Time" value={discrepancyForm.tach_time} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, tach_time: e.target.value }))} />
            <TextField select label="Status" value={discrepancyForm.status} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, status: e.target.value }))}>
              {["pending","closed"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDiscrepancyOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateDiscrepancy}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDiscrepancyOpen} onClose={() => setEditDiscrepancyOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Discrepancy</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Description" value={discrepancyForm.description} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, description: e.target.value }))} />
            <TextField label="ATA Code" value={discrepancyForm.ata_code} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, ata_code: e.target.value }))} />
            <TextField label="Tach Time" value={discrepancyForm.tach_time} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, tach_time: e.target.value }))} />
            <TextField select label="Status" value={discrepancyForm.status} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, status: e.target.value }))}>
              {["pending","closed"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDiscrepancyOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditDiscrepancy}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
