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
import { useEffect, useMemo, useState } from "react";
import {
  createCompany,
  createAircraft,
  createFlight,
  createProfile,
  deleteAircraft,
  deleteProfile,
  deleteFlight,
  fetchAircraft,
  fetchCompanies,
  fetchFlights,
  fetchProfiles,
  updateAircraft,
  updateFlight,
  updateProfile,
} from "../shared/Api";

export default function SiteAdminPortal() {
  const [companies, setCompanies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [flights, setFlights] = useState([]);
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

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [companyData, profileData, aircraftData, flightData] = await Promise.all([
        fetchCompanies(),
        fetchProfiles(),
        fetchAircraft(),
        fetchFlights(),
      ]);
      setCompanies(Array.isArray(companyData) ? companyData : []);
      setProfiles(Array.isArray(profileData) ? profileData : []);
      setAircraft(Array.isArray(aircraftData) ? aircraftData : []);
      setFlights(Array.isArray(flightData) ? flightData : []);
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
          <Grid item xs={12} md={4}>
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
          <Grid item xs={12} md={4}>
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
          <Grid item xs={12} md={4}>
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.locations || "—"}</TableCell>
                      <TableCell>{userCountByCompany.get(c.id) || 0}</TableCell>
                      <TableCell>{aircraftCountByCompany.get(c.id) || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={() => setCreateUserOpen(true)}>
                  Create User
                </Button>
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
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Users
              </Typography>
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
                      <TableCell>{u.company_role || "—"}</TableCell>
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
    </Box>
  );
}
