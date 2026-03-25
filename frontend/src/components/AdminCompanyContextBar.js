import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { fetchCompanies, fetchProfiles } from "../shared/Api";
import { useAppContext } from "../context/AppContext";
import { isPlatformAdmin } from "../shared/rbac";

export default function AdminCompanyContextBar({ roleFilter = [], title = "" }) {
  const { state } = useAppContext();
  const navigate = useNavigate();
  const platformAdmin = isPlatformAdmin(state.user);

  const [companies, setCompanies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCompanyId = useMemo(() => {
    const raw = localStorage.getItem("adminCompanyId");
    return raw ? String(raw) : "";
  }, []);

  const [companyId, setCompanyId] = useState(selectedCompanyId);
  const [selectedUsername, setSelectedUsername] = useState("");

  useEffect(() => {
    if (!platformAdmin) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [companyData, profileData] = await Promise.all([
          fetchCompanies(),
          fetchProfiles(),
        ]);
        if (!mounted) return;
        setCompanies(Array.isArray(companyData) ? companyData : []);
        setProfiles(Array.isArray(profileData) ? profileData : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load admin context data.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [platformAdmin]);

  const usersForRoleAndCompany = useMemo(() => {
    if (!companyId) return [];
    const allowed = new Set(roleFilter);
    return profiles.filter((u) => {
      if (String(u?.company || "") !== String(companyId)) return false;
      if (allowed.size === 0) return true;
      return allowed.has(u?.company_role);
    });
  }, [profiles, companyId, roleFilter]);

  const handleCompanyChange = (next) => {
    setCompanyId(next);
    setSelectedUsername("");
    if (next) localStorage.setItem("adminCompanyId", String(next));
    else localStorage.removeItem("adminCompanyId");
  };

  if (!platformAdmin) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {title ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {title}
        </Typography>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      ) : null}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ md: "center" }}
      >
        <TextField
          size="small"
          select
          label="Company context (admin)"
          value={companyId}
          onChange={(e) => handleCompanyChange(e.target.value)}
          sx={{ minWidth: 260 }}
          disabled={loading}
        >
          <MenuItem value="">Select a company…</MenuItem>
          {companies.map((c) => (
            <MenuItem key={c.id} value={String(c.id)}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          select
          label="User (role)"
          value={selectedUsername}
          onChange={(e) => setSelectedUsername(e.target.value)}
          sx={{ minWidth: 260 }}
          disabled={loading || !companyId}
        >
          <MenuItem value="">
            {companyId ? "(none selected)" : "Select a company first"}
          </MenuItem>
          {usersForRoleAndCompany.map((u) => (
            <MenuItem key={u.id} value={u.username}>
              {u.username} ({u.company_role || "—"})
            </MenuItem>
          ))}
        </TextField>

        {companyId && usersForRoleAndCompany.length === 0 ? (
          <Button variant="outlined" onClick={() => navigate("/site-admin")}>
            No users found — Add user
          </Button>
        ) : (
          <Button variant="outlined" onClick={() => navigate("/site-admin")}>
            Manage users
          </Button>
        )}
      </Stack>
    </Box>
  );
}

