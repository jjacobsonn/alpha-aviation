import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
	Alert,
	Box,
	Card,
	CardContent,
	Chip,
	Container,
	MenuItem,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography,
	Skeleton,
} from '@mui/material';
import { fetchFleetAircraft } from '../shared/Api';

const STATUS_OPTIONS = [
	{ value: '', label: 'All statuses' },
	{ value: 'active', label: 'Active' },
	{ value: 'maintenance_due', label: 'Maintenance Due' },
	{ value: 'aog', label: 'AOG' },
	{ value: 'grounded', label: 'Grounded' },
];

function statusChipColor(status) {
	switch (status) {
		case 'aog':
		case 'grounded':
			return 'error';
		case 'maintenance_due':
			return 'warning';
		default:
			return 'success';
	}
}

const FleetPage = () => {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [aircraft, setAircraft] = useState([]);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [locationFilter, setLocationFilter] = useState('');
	const [typeFilter, setTypeFilter] = useState('');

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			setIsLoading(true);
			setError('');
			try {
				const data = await fetchFleetAircraft();
				if (!mounted) return;
				setAircraft(Array.isArray(data) ? data : []);
			} catch (e) {
				if (!mounted) return;
				setError(e?.message || 'Failed to load fleet directory.');
			} finally {
				if (!mounted) return;
				setIsLoading(false);
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, []);

	const locations = useMemo(() => {
		const vals = Array.from(
			new Set(
				aircraft
					.map((a) => String(a.location || '').trim())
					.filter(Boolean)
			)
		);
		return vals.sort((a, b) => a.localeCompare(b));
	}, [aircraft]);

	const types = useMemo(() => {
		const vals = Array.from(
			new Set(
				aircraft
					.map((a) => String(a.aircraft_type || '').trim())
					.filter(Boolean)
			)
		);
		return vals.sort((a, b) => a.localeCompare(b));
	}, [aircraft]);

	const filteredRows = useMemo(() => {
		const q = search.trim().toLowerCase();
		return aircraft.filter((a) => {
			if (statusFilter && a.fleet_status !== statusFilter) return false;
			if (locationFilter && String(a.location || '') !== locationFilter) return false;
			if (typeFilter && String(a.aircraft_type || '') !== typeFilter) return false;
			if (!q) return true;
			const blob = [
				a.registration_number,
				a.model,
				a.location,
				a.aircraft_type,
				a.fleet_status,
			]
				.join(' ')
				.toLowerCase();
			return blob.includes(q);
		});
	}, [aircraft, search, statusFilter, locationFilter, typeFilter]);

	return (
		<Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Stack spacing={3}>
					<Box>
						<Typography variant="h4" sx={{ fontWeight: 800 }}>
							Fleet
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Aircraft inventory with status and maintenance readiness.
						</Typography>
					</Box>

					<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
						<CardContent>
							<Stack spacing={2}>
								<Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
									<TextField
										fullWidth
										size="small"
										placeholder="Search tail, model, location, type..."
										value={search}
										onChange={(e) => setSearch(e.target.value)}
									/>
									<TextField
										select
										size="small"
										label="Status"
										value={statusFilter}
										onChange={(e) => setStatusFilter(e.target.value)}
										sx={{ minWidth: 180 }}
									>
										{STATUS_OPTIONS.map((opt) => (
											<MenuItem key={opt.value || 'all-status'} value={opt.value}>
												{opt.label}
											</MenuItem>
										))}
									</TextField>
									<TextField
										select
										size="small"
										label="Location"
										value={locationFilter}
										onChange={(e) => setLocationFilter(e.target.value)}
										sx={{ minWidth: 180 }}
									>
										<MenuItem value="">All locations</MenuItem>
										{locations.map((loc) => (
											<MenuItem key={loc} value={loc}>
												{loc}
											</MenuItem>
										))}
									</TextField>
									<TextField
										select
										size="small"
										label="Type"
										value={typeFilter}
										onChange={(e) => setTypeFilter(e.target.value)}
										sx={{ minWidth: 180 }}
									>
										<MenuItem value="">All types</MenuItem>
										{types.map((type) => (
											<MenuItem key={type} value={type}>
												{type}
											</MenuItem>
										))}
									</TextField>
								</Stack>

								{error ? <Alert severity="error">{error}</Alert> : null}

								<Table
									size="small"
									sx={{
										'& .MuiTableCell-head': {
											bgcolor: 'primary.main',
											color: 'common.white',
											fontWeight: 700,
											borderColor: 'divider',
										},
										'& .MuiTableCell-root': { borderColor: 'divider' },
									}}
								>
									<TableHead>
										<TableRow>
											<TableCell>Tail #</TableCell>
											<TableCell>Model</TableCell>
											<TableCell>Type</TableCell>
											<TableCell>Location</TableCell>
											<TableCell>Tach</TableCell>
											<TableCell>Hobbs</TableCell>
											<TableCell>Status</TableCell>
											<TableCell>Intervals</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{!isLoading &&
											filteredRows.map((row) => (
												<TableRow
													key={row.id}
													hover
													sx={{ cursor: 'pointer' }}
													onClick={() => navigate(`/fleet/${row.id}`)}
												>
													<TableCell>{row.registration_number || '—'}</TableCell>
													<TableCell>{row.model || '—'}</TableCell>
													<TableCell>{row.aircraft_type || '—'}</TableCell>
													<TableCell>{row.location || '—'}</TableCell>
													<TableCell>{row.tach_current ?? '—'}</TableCell>
													<TableCell>{row.hobbs_current ?? '—'}</TableCell>
													<TableCell>
														<Chip
															size="small"
															label={row.fleet_status || 'active'}
															color={statusChipColor(row.fleet_status)}
														/>
													</TableCell>
													<TableCell>
														{row?.interval_summary
															? `${row.interval_summary.overdue_count || 0} overdue / ${row.interval_summary.due_soon_count || 0} due soon`
															: '—'}
													</TableCell>
												</TableRow>
											))}
										{isLoading
											? [...Array(6)].map((_, idx) => (
													<TableRow key={`fleet-skeleton-${idx}`}>
														<TableCell colSpan={8}>
															<Skeleton variant="text" />
														</TableCell>
													</TableRow>
											  ))
											: null}
										{!isLoading && filteredRows.length === 0 ? (
											<TableRow>
												<TableCell colSpan={8} sx={{ color: 'text.secondary', py: 3 }}>
													No aircraft found for current filters. Try clearing search/filter values.
												</TableCell>
											</TableRow>
										) : null}
									</TableBody>
								</Table>
							</Stack>
						</CardContent>
					</Card>
				</Stack>
			</Container>
		</Box>
	);
};

export default FleetPage;
