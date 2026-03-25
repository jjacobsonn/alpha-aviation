import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  createDiscrepancy,
  fetchCompanyDiscrepancies,
  fetchCompanyFlights,
  fetchCurrentUser,
} from "../shared/Api";
import { useAppContext } from "../context/AppContext";
import { isPlatformAdmin } from "../shared/rbac";

export default function PilotDashboard() {
  const { state } = useAppContext();
  const platformAdmin = isPlatformAdmin(state.user);
  const hasCompanyContext =
    Boolean(state.user?.companyId) || Boolean(localStorage.getItem("adminCompanyId"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flights, setFlights] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [newDiscrepancy, setNewDiscrepancy] = useState({
    aircraft: "",
    ata_code: "",
    tach_time: "",
    description: "",
  });
  const [creatingDiscrepancy, setCreatingDiscrepancy] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (platformAdmin && !hasCompanyContext) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [me, allFlights, allDiscrepancies] = await Promise.all([
          fetchCurrentUser(),
          fetchCompanyFlights(),
          fetchCompanyDiscrepancies(),
        ]);
        if (!mounted) return;
        setCurrentUser(me || null);

        const myFlights = (Array.isArray(allFlights) ? allFlights : []).filter((f) => {
          const pid = Number(f?.primary_pilot);
          const sid = Number(f?.secondary_pilot);
          return pid === Number(me?.id) || sid === Number(me?.id);
        });
        setFlights(myFlights);
        setDiscrepancies(Array.isArray(allDiscrepancies) ? allDiscrepancies : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load pilot dashboard.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [platformAdmin, hasCompanyContext]);

  const pendingDiscrepancies = useMemo(
    () => discrepancies.filter((d) => d?.status === "pending").length,
    [discrepancies]
  );

  const handleCreateDiscrepancy = async () => {
    if (!currentUser?.id || !newDiscrepancy.aircraft || !newDiscrepancy.description) {
      setError("Aircraft and description are required to submit a discrepancy.");
      return;
    }
    setCreatingDiscrepancy(true);
    setError("");
    try {
      await createDiscrepancy({
        work_order: null,
        aircraft: Number(newDiscrepancy.aircraft),
        reporter: Number(currentUser.id),
        date_reported: new Date().toISOString().slice(0, 10),
        description: newDiscrepancy.description,
        ata_code: newDiscrepancy.ata_code || "",
        tach_time: newDiscrepancy.tach_time || "",
        status: "pending",
      });
      setNewDiscrepancy({
        aircraft: "",
        ata_code: "",
        tach_time: "",
        description: "",
      });
      const disc = await fetchCompanyDiscrepancies();
      setDiscrepancies(Array.isArray(disc) ? disc : []);
    } catch (e) {
      setError(e?.message || "Failed to submit discrepancy.");
    } finally {
      setCreatingDiscrepancy(false);
    }
  };

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Pilot Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Flight operations overview for pilot users.
            </Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Assigned Flights
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {loading ? "—" : flights.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Pending Discrepancies
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {loading ? "—" : pendingDiscrepancies}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Pilot User
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {loading ? "—" : currentUser?.username || "—"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                My Flights
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Flight #</TableCell>
                    <TableCell>Aircraft</TableCell>
                    <TableCell>Origin</TableCell>
                    <TableCell>Destination</TableCell>
                    <TableCell>Departure</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flights.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.flight_number || "—"}</TableCell>
                      <TableCell>{f.aircraft_name || f.aircraft || "—"}</TableCell>
                      <TableCell>{f.origin || "—"}</TableCell>
                      <TableCell>{f.destination || "—"}</TableCell>
                      <TableCell>{f.departure_time || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Stack>
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", mt: 2 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Submit Discrepancy
              </Typography>
              <TextField
                select
                label="Aircraft"
                value={newDiscrepancy.aircraft}
                onChange={(e) =>
                  setNewDiscrepancy((s) => ({ ...s, aircraft: e.target.value }))
                }
                SelectProps={{ native: true }}
              >
                <option value="" />
                {flights
                  .map((f) => ({ id: f.aircraft, label: f.aircraft_name || f.aircraft }))
                  .filter((v, i, arr) => arr.findIndex((a) => String(a.id) === String(v.id)) === i)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
              </TextField>
              <TextField
                label="ATA Code"
                value={newDiscrepancy.ata_code}
                onChange={(e) =>
                  setNewDiscrepancy((s) => ({ ...s, ata_code: e.target.value }))
                }
              />
              <TextField
                label="Tach Time"
                value={newDiscrepancy.tach_time}
                onChange={(e) =>
                  setNewDiscrepancy((s) => ({ ...s, tach_time: e.target.value }))
                }
              />
              <TextField
                label="Description"
                multiline
                minRows={3}
                value={newDiscrepancy.description}
                onChange={(e) =>
                  setNewDiscrepancy((s) => ({ ...s, description: e.target.value }))
                }
              />
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  variant="contained"
                  onClick={handleCreateDiscrepancy}
                  disabled={creatingDiscrepancy}
                >
                  {creatingDiscrepancy ? "Submitting..." : "Submit"}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", mt: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              My Discrepancies
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
                {discrepancies
                  .filter((d) => Number(d?.reporter) === Number(currentUser?.id))
                  .map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.id}</TableCell>
                      <TableCell>{d.status || "—"}</TableCell>
                      <TableCell>{d.ata_code || "—"}</TableCell>
                      <TableCell>{d.description || "—"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", mt: 2 }}>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="body1" sx={{ mt: 1 }}>
                Next step: add pilot create/edit flows for discrepancies and personalized
                schedule filters.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
