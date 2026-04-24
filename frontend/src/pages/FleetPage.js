import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useAppContext } from '../context/AppContext';
import {
	createAircraft,
	deleteAircraft,
	fetchFleetAircraft,
	fetchFleetAircraftDetail,
	updateAircraft,
} from '../shared/Api';
import { isPlatformAdmin } from '../shared/rbac';

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

function formatFleetStatusLabel(status) {
	if (!status) return 'Active';
	return String(status)
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function formatIntervalSummary(summary) {
	if (!summary) return 'No interval data';
	const overdue = summary.overdue_count || 0;
	const dueSoon = summary.due_soon_count || 0;
	return `Overdue: ${overdue} | Due Soon: ${dueSoon}`;
}

const FleetPage = () => {
	const navigate = useNavigate();
	const { state } = useAppContext();
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [aircraft, setAircraft] = useState([]);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [locationFilter, setLocationFilter] = useState('');
	const [typeFilter, setTypeFilter] = useState('');
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({
		registration_number: '',
		model: '',
		manufacturer: '',
		engine_type: '',
		year_built: '',
		location: '',
		aircraft_type: '',
		tach_current: '',
		hobbs_current: '',
		fleet_status: 'active',
	});

	const effectiveRole = state.viewAsUser?.role || state.user?.role;
	const canManageFleet = isPlatformAdmin(state.user) || ['owner', 'manager'].includes(effectiveRole);

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

	const refreshFleet = async () => {
		const data = await fetchFleetAircraft();
		setAircraft(Array.isArray(data) ? data : []);
	};

	const openCreate = () => {
		setEditingId(null);
		setForm({
			registration_number: '',
			model: '',
			manufacturer: '',
			engine_type: '',
			year_built: '',
			location: '',
			aircraft_type: '',
			tach_current: '',
			hobbs_current: '',
			fleet_status: 'active',
		});
		setFormOpen(true);
	};

	const openEdit = async (row) => {
		try {
			setSaving(true);
			setError('');
			const detail = await fetchFleetAircraftDetail(row.id);
			setEditingId(row.id);
			setForm({
				registration_number: detail?.registration_number || row.registration_number || '',
				model: detail?.model || row.model || '',
				manufacturer: detail?.manufacturer || '',
				engine_type: detail?.engine_type || '',
				year_built: detail?.year_built ?? '',
				location: detail?.location || row.location || '',
				aircraft_type: detail?.aircraft_type || row.aircraft_type || '',
				tach_current: detail?.tach_current ?? row.tach_current ?? '',
				hobbs_current: detail?.hobbs_current ?? row.hobbs_current ?? '',
				fleet_status: detail?.fleet_status || row.fleet_status || 'active',
			});
			setFormOpen(true);
		} catch (e) {
			setError(e?.message || 'Failed to load aircraft for editing.');
		} finally {
			setSaving(false);
		}
	};

	const handleSave = async () => {
		if (!form.registration_number.trim() || !form.model.trim() || !form.manufacturer.trim() || !form.year_built) {
			setError('Tail number, model, manufacturer, and year built are required.');
			return;
		}
		try {
			setSaving(true);
			setError('');
			const payload = {
				registration_number: form.registration_number.trim(),
				model: form.model.trim(),
				manufacturer: form.manufacturer.trim(),
				engine_type: form.engine_type.trim(),
				year_built: Number(form.year_built),
				location: form.location.trim(),
				aircraft_type: form.aircraft_type.trim(),
				tach_current: form.tach_current === '' ? null : Number(form.tach_current),
				hobbs_current: form.hobbs_current === '' ? null : Number(form.hobbs_current),
				fleet_status: form.fleet_status,
			};
			if (editingId) await updateAircraft(editingId, payload);
			else await createAircraft(payload);
			setFormOpen(false);
			await refreshFleet();
		} catch (e) {
			setError(e?.message || 'Failed to save aircraft.');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (id) => {
		try {
			setSaving(true);
			setError('');
			await deleteAircraft(id);
			setAircraft((prev) => prev.filter((row) => row.id !== id));
		} catch (e) {
			setError(e?.message || 'Failed to delete aircraft.');
		} finally {
			setSaving(false);
		}
	};

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
					{canManageFleet ? (
						<Stack direction="row" justifyContent="flex-end">
							<Button variant="contained" onClick={openCreate}>
								Add Aircraft Record
							</Button>
						</Stack>
					) : null}

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
											{canManageFleet ? <TableCell>Actions</TableCell> : null}
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
															label={formatFleetStatusLabel(row.fleet_status)}
															color={statusChipColor(row.fleet_status)}
														/>
													</TableCell>
													<TableCell>
														{formatIntervalSummary(row?.interval_summary)}
													</TableCell>
													{canManageFleet ? (
														<TableCell onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
															<Button size="small" variant="outlined" onClick={() => openEdit(row)}>
																Edit
															</Button>
															<Button
																size="small"
																color="error"
																sx={{ ml: 1 }}
																onClick={() => handleDelete(row.id)}
																disabled={saving}
															>
																Delete
															</Button>
														</TableCell>
													) : null}
												</TableRow>
											))}
										{isLoading
											? [...Array(6)].map((_, idx) => (
													<TableRow key={`fleet-skeleton-${idx}`}>
														<TableCell colSpan={canManageFleet ? 9 : 8}>
															<Skeleton variant="text" />
														</TableCell>
													</TableRow>
											  ))
											: null}
										{!isLoading && filteredRows.length === 0 ? (
											<TableRow>
												<TableCell colSpan={canManageFleet ? 9 : 8} sx={{ color: 'text.secondary', py: 3 }}>
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
			<Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="md">
				<DialogTitle>{editingId ? 'Edit Aircraft Record' : 'Create Aircraft Record'}</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
							<TextField
								fullWidth
								label="Tail #"
								value={form.registration_number}
								onChange={(e) => setForm((prev) => ({ ...prev, registration_number: e.target.value }))}
							/>
							<TextField
								fullWidth
								label="Model"
								value={form.model}
								onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
							/>
							<TextField
								fullWidth
								label="Manufacturer"
								value={form.manufacturer}
								onChange={(e) => setForm((prev) => ({ ...prev, manufacturer: e.target.value }))}
							/>
						</Stack>
						<Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
							<TextField
								fullWidth
								label="Engine Type"
								value={form.engine_type}
								onChange={(e) => setForm((prev) => ({ ...prev, engine_type: e.target.value }))}
							/>
							<TextField
								fullWidth
								type="number"
								label="Year Built"
								value={form.year_built}
								onChange={(e) => setForm((prev) => ({ ...prev, year_built: e.target.value }))}
							/>
							<TextField
								fullWidth
								label="Type"
								value={form.aircraft_type}
								onChange={(e) => setForm((prev) => ({ ...prev, aircraft_type: e.target.value }))}
							/>
						</Stack>
						<Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
							<TextField
								fullWidth
								label="Location"
								value={form.location}
								onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
							/>
							<TextField
								fullWidth
								type="number"
								label="Tach"
								value={form.tach_current}
								onChange={(e) => setForm((prev) => ({ ...prev, tach_current: e.target.value }))}
							/>
							<TextField
								fullWidth
								type="number"
								label="Hobbs"
								value={form.hobbs_current}
								onChange={(e) => setForm((prev) => ({ ...prev, hobbs_current: e.target.value }))}
							/>
							<TextField
								fullWidth
								select
								label="Status"
								value={form.fleet_status}
								onChange={(e) => setForm((prev) => ({ ...prev, fleet_status: e.target.value }))}
							>
								{STATUS_OPTIONS.filter((s) => s.value).map((s) => (
									<MenuItem key={s.value} value={s.value}>
										{s.label}
									</MenuItem>
								))}
							</TextField>
						</Stack>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setFormOpen(false)}>Cancel</Button>
					<Button variant="contained" onClick={handleSave} disabled={saving}>
						{editingId ? 'Save Changes' : 'Create'}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default FleetPage;
