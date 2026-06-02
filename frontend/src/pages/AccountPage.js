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
  /** Staff/superuser: site-wide tooling; company role still shown read-only. */
  const [platformAccount, setPlatformAccount] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);

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
    setPlatformAccount(Boolean(data.is_staff || data.is_superuser));
    setIsStaff(Boolean(data.is_staff));
    setIsSuperuser(Boolean(data.is_superuser));
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

  const tenantRoleDisplay = useMemo(
    () => ROLE_LABEL[companyRole] || companyRole || "—",
    [companyRole]
  );

  const platformAccessLabel = useMemo(() => {
    if (!platformAccount) return "";
    if (isSuperuser) return "Superuser";
    if (isStaff) return "Staff";
    return "Platform";
  }, [platformAccount, isSuperuser, isStaff]);

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

  const showPilotCerts = companyRole === "pilot" && !platformAccount;
  const showMechanicCerts = companyRole === "mechanic" && !platformAccount;

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", py: 2, px: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Account & profile
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {platformAccount
          ? "Update contact details for this platform login. You are not viewing a tenant company profile here."
          : "Update your personal contact info. Organization membership and aviation certification records stay with your administrator; this page marks what you can safely change yourself."}
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
                helperText={
                  platformAccount
                    ? "Platform login identity; renaming is handled in admin tooling."
                    : "Username is assigned by your company administrator."
                }
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
            Organization & role
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Company"
              value={
                companyName?.trim()
                  ? companyName
                  : platformAccount
                    ? "None (platform login)"
                    : "—"
              }
              fullWidth
              disabled
              size="small"
            />
            <TextField
              label="Company role"
              value={tenantRoleDisplay}
              fullWidth
              disabled
              size="small"
              helperText="Assigned by an administrator. You cannot change your role on this page."
            />
            {platformAccount ? (
              <TextField
                label="Platform access"
                value={platformAccessLabel}
                fullWidth
                disabled
                size="small"
                helperText="Site Admin and cross-tenant tools. This is separate from your company role above."
              />
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {showPilotCerts ? (
        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Pilot qualifications (view only)
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                These values live on the Pilot record tied to your user. They are
                not editable on this screen. Today they are usually updated via
                Django admin (Pilot / Profile) by an owner/manager or platform staff;
                the SPA does not expose a pilot self-edit flow for certs yet (backlog
                1.3.1 / 1.3.2).
              </Typography>
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
                Planned: reminders at 30/14/7 days before expiry (1.3.2); not wired in
                the web app UI yet.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {showMechanicCerts ? (
        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Mechanic qualifications (view only)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Stored on the Mechanic record for your login. Editing is administrative
              (Django admin / internal tools), not here.
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

    </Box>
  );
}
