import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  TextField,
  Typography,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { makeApiRequest } from '../shared/Api';

const emptyUser = { first_name: '', middle_name: '', last_name: '', email: '', role: '' };
const emptyAircraft = { registration_number: '', model: '', manufacturer: '', engine_type: '', year_built: '' };

const AdminCompanyForm = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [locations, setLocations] = useState('');
  const [users, setUsers] = useState([emptyUser]);
  const [aircraft, setAircraft] = useState([emptyAircraft]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateUser = (index, field, value) => {
    setUsers((prev) => prev.map((u, i) => (i === index ? { ...u, [field]: value } : u)));
  };

  const updateAircraft = (index, field, value) => {
    setAircraft((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // 1. Create the company
      const company = await makeApiRequest('POST', '/companies/', {
        name,
        locations,
      });

      // 2. Create aircraft tied to this company
      const cleanAircraft = aircraft.filter(
        (a) => a.registration_number || a.model || a.manufacturer
      );

      await Promise.all(
        cleanAircraft.map((a) =>
          makeApiRequest('POST', '/aircraft/', {
            registration_number: a.registration_number,
            model: a.model,
            manufacturer: a.manufacturer,
            engine_type: a.engine_type,
            year_built: a.year_built ? Number(a.year_built) : null,
            company: company.id,
          })
        )
      );

      // NOTE: User creation is more security-sensitive (passwords, invites),
      // so for now user cards are just a planning aid; actual Profile creation
      // still happens via Django admin or a future invite flow.

      setSuccess(`Company "${company.name}" and ${cleanAircraft.length} aircraft created.`);
      setName('');
      setLocations('');
      setUsers([emptyUser]);
      setAircraft([emptyAircraft]);
    } catch (e) {
      setError(e?.message || 'Failed to create company.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <IconButton onClick={() => navigate('/admin/companies')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            New Company
          </Typography>
        </Stack>

        <form onSubmit={handleSubmit} noValidate>
          <Stack spacing={3}>
            {/* Company Details */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Company details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Company name"
                      fullWidth
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Locations"
                      fullWidth
                      placeholder="e.g. Dallas, TX; Austin, TX"
                      value={locations}
                      onChange={(e) => setLocations(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Users */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Users
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setUsers((prev) => [...prev, emptyUser])}
                  >
                    Add user
                  </Button>
                </Stack>
                <Stack spacing={2}>
                  {users.map((u, index) => (
                    <Card
                      key={index}
                      variant="outlined"
                      sx={{ borderRadius: 2, borderColor: 'divider' }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <TextField
                              label="First name"
                              fullWidth
                              value={u.first_name}
                              onChange={(e) => updateUser(index, 'first_name', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              label="Middle name"
                              fullWidth
                              value={u.middle_name}
                              onChange={(e) => updateUser(index, 'middle_name', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              label="Last name"
                              fullWidth
                              value={u.last_name}
                              onChange={(e) => updateUser(index, 'last_name', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Email"
                              type="email"
                              fullWidth
                              value={u.email}
                              onChange={(e) => updateUser(index, 'email', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} md={5}>
                            <TextField
                              label="Role (owner, manager, mechanic, pilot, dispatcher)"
                              fullWidth
                              value={u.role}
                              onChange={(e) => updateUser(index, 'role', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <IconButton
                              edge="end"
                              onClick={() =>
                                setUsers((prev) => prev.filter((_, i) => i !== index))
                              }
                              disabled={users.length === 1}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Aircraft */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Aircraft
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setAircraft((prev) => [...prev, emptyAircraft])}
                  >
                    Add aircraft
                  </Button>
                </Stack>
                <Stack spacing={2}>
                  {aircraft.map((a, index) => (
                    <Card
                      key={index}
                      variant="outlined"
                      sx={{ borderRadius: 2, borderColor: 'divider' }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <TextField
                              label="Registration number"
                              fullWidth
                              value={a.registration_number}
                              onChange={(e) =>
                                updateAircraft(index, 'registration_number', e.target.value)
                              }
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              label="Model"
                              fullWidth
                              value={a.model}
                              onChange={(e) => updateAircraft(index, 'model', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              label="Manufacturer"
                              fullWidth
                              value={a.manufacturer}
                              onChange={(e) =>
                                updateAircraft(index, 'manufacturer', e.target.value)
                              }
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Engine type"
                              fullWidth
                              value={a.engine_type}
                              onChange={(e) =>
                                updateAircraft(index, 'engine_type', e.target.value)
                              }
                            />
                          </Grid>
                          <Grid item xs={12} md={5}>
                            <TextField
                              label="Year built"
                              type="number"
                              fullWidth
                              value={a.year_built}
                              onChange={(e) =>
                                updateAircraft(index, 'year_built', e.target.value)
                              }
                            />
                          </Grid>
                          <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <IconButton
                              edge="end"
                              onClick={() =>
                                setAircraft((prev) => prev.filter((_, i) => i !== index))
                              }
                              disabled={aircraft.length === 1}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {error && (
              <Typography color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
            {success && (
              <Typography color="success.main" sx={{ mt: 1 }}>
                {success}
              </Typography>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting || !name}
              >
                {submitting ? 'Saving…' : 'Create company'}
              </Button>
            </Box>
          </Stack>
        </form>
      </Container>
    </Box>
  );
};

export default AdminCompanyForm;

