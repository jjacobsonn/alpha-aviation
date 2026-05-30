import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router';
import {
  Box,
  Container,
  Typography,
  Stack,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  Chip,
  Link,
} from '@mui/material';

import ScrollableTableContainer from '../components/ScrollableTableContainer';
import { useAppContext } from '../context/AppContext';
import {
  fetchCompanyUsers,
  fetchCompanyAircrafts,
  fetchCompanyFlights,
  fetchCompanyLowStockInventoriesDetailed,
  fetchCompanyById,
} from '../shared/Api';

const CompanyOverview = () => {
  const { state } = useAppContext();
  const [searchParams] = useSearchParams();
  const companyQuery = searchParams.get('company');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [displayCompanyName, setDisplayCompanyName] = useState('');

  const [users, setUsers] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [lowStockInventories, setLowStockInventories] = useState([]);
  const [flights, setFlights] = useState([]);
  const [awaitingCompanyContext, setAwaitingCompanyContext] = useState(false);

  useEffect(() => {
    if (!state.initialized) {
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      setAwaitingCompanyContext(false);

      if (companyQuery) {
        localStorage.setItem('adminCompanyId', companyQuery);
      }

      const adminCompanyId = localStorage.getItem('adminCompanyId');
      const isPlatformAdmin = Boolean(state.user?.isStaff || state.user?.isSuperuser);

      if (isPlatformAdmin && !adminCompanyId) {
        if (!mounted) return;
        setUsers([]);
        setAircraft([]);
        setLowStockInventories([]);
        setFlights([]);
        setDisplayCompanyName('');
        setAwaitingCompanyContext(true);
        setLoading(false);
        return;
      }

      let name = state.user?.companyName || '';
      if (isPlatformAdmin && adminCompanyId) {
        try {
          const co = await fetchCompanyById(adminCompanyId);
          if (mounted && co?.name) {
            name = co.name;
          }
        } catch {
          /* keep fallback name */
        }
      }
      if (mounted) {
        setDisplayCompanyName(name || 'Company');
      }

      try {
        const [userData, aircraftData, lowStockData, flightData] =
          await Promise.all([
            fetchCompanyUsers(),
            fetchCompanyAircrafts(),
            fetchCompanyLowStockInventoriesDetailed(),
            fetchCompanyFlights(),
          ]);

        if (!mounted) return;
        setUsers(Array.isArray(userData) ? userData : []);
        setAircraft(Array.isArray(aircraftData) ? aircraftData : []);
        setLowStockInventories(Array.isArray(lowStockData) ? lowStockData : []);
        setFlights(Array.isArray(flightData) ? flightData : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load organization overview.');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [
    state.initialized,
    companyQuery,
    state.user?.isStaff,
    state.user?.isSuperuser,
    state.user?.companyId,
    state.user?.companyName,
  ]);

  const companyName = displayCompanyName || state.user?.companyName || 'Company';

  const lowStockCount = useMemo(() => lowStockInventories.length, [lowStockInventories]);

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ letterSpacing: 1.2, fontWeight: 600 }}
          >
            Organization overview
          </Typography>
          <Typography
            component="h1"
            variant="h3"
            sx={{ fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.5 }}
          >
            {companyName}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.5 }}>
            <Chip label={`Low Stock Items: ${lowStockCount}`} color={lowStockCount ? 'error' : 'success'} />
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {awaitingCompanyContext && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Choose an organization from{' '}
            <Link component={RouterLink} to="/admin/companies" underline="hover">
              Organizations
            </Link>{' '}
            to set company context for this page.
          </Alert>
        )}

        {!state.initialized || loading ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : (
          <Stack spacing={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Users
                </Typography>
                <ScrollableTableContainer minWidth={640}>
                <Table size="small" sx={{ '& .MuiTableCell-root': { whiteSpace: 'nowrap' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Username</TableCell>
                      <TableCell>First</TableCell>
                      <TableCell>Last</TableCell>
                      <TableCell>Role</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.username}</TableCell>
                        <TableCell>{u.first_name}</TableCell>
                        <TableCell>{u.last_name}</TableCell>
                        <TableCell>{u.company_role}</TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ color: 'text.secondary' }}>
                          No users found for this company.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </ScrollableTableContainer>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Aircraft
                </Typography>
                <ScrollableTableContainer minWidth={640}>
                <Table size="small" sx={{ '& .MuiTableCell-root': { whiteSpace: 'nowrap' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Registration</TableCell>
                      <TableCell>Model</TableCell>
                      <TableCell>Manufacturer</TableCell>
                      <TableCell>Engine</TableCell>
                      <TableCell>Year</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {aircraft.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.registration_number}</TableCell>
                        <TableCell>{a.model}</TableCell>
                        <TableCell>{a.manufacturer}</TableCell>
                        <TableCell>{a.engine_type || '—'}</TableCell>
                        <TableCell>{a.year_built || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {aircraft.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ color: 'text.secondary' }}>
                          No aircraft found for this company.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </ScrollableTableContainer>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Low Stock
                </Typography>
                <ScrollableTableContainer minWidth={640}>
                <Table size="small" sx={{ '& .MuiTableCell-root': { whiteSpace: 'nowrap' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Part</TableCell>
                      <TableCell>In Stock</TableCell>
                      <TableCell>Stock Alert</TableCell>
                      <TableCell>Shop Location</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockInventories.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          {inv?.part?.part_number} - {inv?.part?.name}
                        </TableCell>
                        <TableCell>{inv.in_stock}</TableCell>
                        <TableCell>{inv.stock_alert}</TableCell>
                        <TableCell>{inv.shop_location || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {lowStockInventories.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ color: 'text.secondary' }}>
                          No low-stock items at the moment.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </ScrollableTableContainer>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Flights
                </Typography>
                <ScrollableTableContainer minWidth={640}>
                <Table size="small" sx={{ '& .MuiTableCell-root': { whiteSpace: 'nowrap' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Flight #</TableCell>
                      <TableCell>Aircraft</TableCell>
                      <TableCell>Route</TableCell>
                      <TableCell>Departure</TableCell>
                      <TableCell>Arrival</TableCell>
                      <TableCell>Approved</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {flights.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>{f.flight_number}</TableCell>
                        <TableCell>{f?.aircraft?.model || f?.aircraft || '—'}</TableCell>
                        <TableCell>
                          {f.origin} → {f.destination}
                        </TableCell>
                        <TableCell>{f.departure_time}</TableCell>
                        <TableCell>{f.arrival_time}</TableCell>
                        <TableCell>{f.approved ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                    {flights.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ color: 'text.secondary' }}>
                          No flights found for this company.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </ScrollableTableContainer>
              </CardContent>
            </Card>
          </Stack>
        )}
      </Container>
    </Box>
  );
};

export default CompanyOverview;

