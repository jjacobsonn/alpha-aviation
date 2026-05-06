import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAppContext, ACTION_TYPES } from "../context/AppContext";
import { fetchCurrentUser, patchCurrentUser } from "../shared/Api";

const ROLE_LABEL = {
  owner: "Owner",
  manager: "Manager",
  mechanic: "Mechanic",
  dispatcher: "Dispatcher",
  pilot: "Pilot",
};

const PILOT_CERT_LABEL = {
  none: "—",
  student: "Student",
  private: "Private",
  commercial: "Commercial",
  airline: "Airline transport",
};

function formatCert(value) {
  return PILOT_CERT_LABEL[value] || value || "—";
}

export default function AccountPage() {
  const { dispatch } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedOk, setSavedOk] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [username, setUsername] = useState("");
  const [companyRole, setCompanyRole] = useState("");
  const [isStaff, setIsStaff] = useState(false);

  const [pilotCertificate, setPilotCertificate] = useState("");
  const [medicallyClearedUntil, setMedicallyClearedUntil] = useState(null);
  const [apCertificateNumber, setApCertificateNumber] = useState(null);

  const hydrate = useCallback((data) => {
    setUsername(data.username || "");
    setFirstName(data.first_name || "");
    setMiddleName(data.middle_name || "");
    setLastName(data.last_name || "");
    setEmail(data.email || "");
    setPhoneNumber(data.phone_number || "");
    setCompanyName(data.company_name || "");
    setCompanyRole(data.company_role || "");
    setIsStaff(Boolean(data.is_staff || data.is_superuser));
    setPilotCertificate(
      Object.prototype.hasOwnProperty.call(data, "pilot_certificate")
        ? data.pilot_certificate ?? ""
        : ""
    );
    setMedicallyClearedUntil(
      Object.prototype.hasOwnProperty.call(data, "medically_cleared_until")
        ? data.medically_cleared_until ?? null
        : null
    );
    setApCertificateNumber(
      Object.prototype.hasOwnProperty.call(data, "ap_certificate_number")
        ? data.ap_certificate_number
        : null
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCurrentUser();
        if (!cancelled) hydrate(data);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not load account.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const roleDisplay = useMemo(() => {
    if (isStaff) return "Platform admin";
    return ROLE_LABEL[companyRole] || companyRole || "—";
  }, [companyRole, isStaff]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSavedOk(false);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_name: middleName.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim(),
      };
      const data = await patchCurrentUser(payload);
      hydrate(data);
      dispatch({ type: ACTION_TYPES.UPDATE_USER, payload: data });
      setSavedOk(true);
    } catch (e) {
      const msg =
        e?.data &&
        typeof e.data === "object" &&
        !Array.isArray(e.data) &&
        Object.values(e.data)
          .flat()
          .filter(Boolean)
          .join(" ");
      setError(msg || e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 320,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", py: 2, px: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Account & profile
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Update your contact details. Organization and permissions are assigned
        by your company administrators.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {savedOk ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSavedOk(false)}>
          Profile saved.
        </Alert>
      ) : null}

      <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            Contact
          </Typography>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Username"
                value={username}
                fullWidth
                disabled
                size="small"
                helperText="Username is managed by an administrator."
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="First name"
                value={firstName}
                onChange={(ev) => setFirstName(ev.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Middle name"
                value={middleName}
                onChange={(ev) => setMiddleName(ev.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Last name"
                value={lastName}
                onChange={(ev) => setLastName(ev.target.value)}
                fullWidth
                size="small"
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Phone"
                value={phoneNumber}
                onChange={(ev) => setPhoneNumber(ev.target.value)}
                fullWidth
                size="small"
                inputProps={{ maxLength: 10 }}
                helperText="Up to 10 characters (digits / company standard)."
              />
            </Stack>
            <Box>
              <Button
                variant="contained"
                onClick={() => save()}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            Organization
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>Company:</strong> {companyName || "—"}
            </Typography>
            <Typography variant="body2">
              <strong>Role:</strong> {roleDisplay}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {companyRole === "pilot" ? (
        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Pilot certificates (reference)
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Certificate level:</strong>{" "}
                {formatCert(pilotCertificate)}
              </Typography>
              <Typography variant="body2">
                <strong>Medical good through:</strong>{" "}
                {medicallyClearedUntil
                  ? String(medicallyClearedUntil).slice(0, 10)
                  : "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Certification changes and expiry alerts use backlog item 1.3.2
                / operations workflows.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {companyRole === "mechanic" ? (
        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Mechanic certifications (reference)
            </Typography>
            <Typography variant="body2">
              <strong>A&amp;P certificate #:</strong>{" "}
              {apCertificateNumber != null && apCertificateNumber !== ""
                ? apCertificateNumber
                : "—"}
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: "action.hover" }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Notifications & preferences
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Phase&nbsp;2 backlog includes in-app alerts, email notification
            settings, certification reminders (1.3.2), and flight-status
            notifications. Operational status for your assignments still appears
            on your role dashboards (Pilot, Dispatcher, Maintenance, etc.).
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
