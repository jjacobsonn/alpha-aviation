import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
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
	Grid,
	Link,
	MenuItem,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from '@mui/material';
import {
	completeAircraftInterval,
	createAircraftInterval,
	deleteAircraftInterval,
	fetchAircraftIntervals,
	fetchFleetAircraftDetail,
	updateAircraftInterval,
} from '../shared/Api';
import { useAppContext } from '../context/AppContext';
import { isPlatformAdmin } from '../shared/rbac';

function intervalChip(status) {
	if (status === 'overdue') return 'error';
	if (status === 'due_soon') return 'warning';
	return 'success';
}

function formatFleetStatusLabel(status) {
	if (!status) return 'Active';
	const normalized = String(status).toLowerCase();
	if (normalized === 'aog') return 'AOG';
	return normalized
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

const FleetDetailPage = () => {
	const { id } = useParams();
	const { state } = useAppContext();
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [aircraft, setAircraft] = useState(null);
	const [intervals, setIntervals] = useState([]);
	const [savingIntervalId, setSavingIntervalId] = useState(null);
	const [isCreatingInterval, setIsCreatingInterval] = useState(false);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingIntervalId, setEditingIntervalId] = useState(null);
	const [newInterval, setNewInterval] = useState({
		name: '',
		interval_type: 'hours',
		hours_remaining_input: '',
		days_remaining_input: '',
		notes: '',
	});
	const [editInterval, setEditInterval] = useState({
		name: '',
		interval_type: 'hours',
		hours_remaining_input: '',
		days_remaining_input: '',
		notes: '',
	});

	const userRole = state.viewAsUser?.role || state.user?.role || state.user?.company_role;
	const canEditDetail =
		isPlatformAdmin(state.user) || ['owner', 'manager', 'mechanic'].includes(userRole);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			setIsLoading(true);
			setError('');
			try {
				const [detail, intervalRows] = await Promise.all([
					fetchFleetAircraftDetail(id),
					fetchAircraftIntervals(id),
				]);
				if (!mounted) return;
				setAircraft(detail || null);
				const rows = Array.isArray(intervalRows) ? intervalRows : [];
				setIntervals(rows);
			} catch (e) {
				if (!mounted) return;
				setError(e?.message || 'Failed to load aircraft detail.');
			} finally {
				if (!mounted) return;
				setIsLoading(false);
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, [id]);

	const specsEntries = Object.entries(aircraft?.specs || {});

	const handleCompleteInterval = async (intervalId) => {
		try {
			setSavingIntervalId(intervalId);
			const today = new Date().toISOString().slice(0, 10);
			const updated = await completeAircraftInterval(intervalId, {
				completed_date: today,
				completed_tach: aircraft?.tach_current ?? undefined,
				completed_hobbs: aircraft?.hobbs_current ?? undefined,
			});
			setIntervals((prev) =>
				prev.map((row) => (row.id === intervalId ? { ...row, ...updated } : row))
			);
		} catch (e) {
			setError(e?.message || 'Failed to complete interval.');
		} finally {
			setSavingIntervalId(null);
		}
	};

	const handleCreateInterval = async () => {
		if (!newInterval.name.trim()) {
			setError('Interval name is required.');
			return false;
		}
		if (
			(newInterval.interval_type === 'hours' || newInterval.interval_type === 'both') &&
			newInterval.hours_remaining_input === ''
		) {
			setError('Due hours is required for hours/both intervals.');
			return false;
		}
		if (
			(newInterval.interval_type === 'days' || newInterval.interval_type === 'both') &&
			newInterval.days_remaining_input === ''
		) {
			setError('Due days is required for days/both intervals.');
			return false;
		}
		try {
			setIsCreatingInterval(true);
			setError('');
			const today = new Date().toISOString().slice(0, 10);
			const hoursRemaining =
				newInterval.hours_remaining_input === '' ? null : Number(newInterval.hours_remaining_input);
			const daysRemaining =
				newInterval.days_remaining_input === '' ? null : Number(newInterval.days_remaining_input);
			const payload = {
				name: newInterval.name.trim(),
				interval_type: newInterval.interval_type,
				due_every_hours: hoursRemaining,
				due_every_days: daysRemaining,
				last_done_tach: hoursRemaining === null ? null : aircraft?.tach_current ?? null,
				last_done_hobbs: hoursRemaining === null ? null : aircraft?.hobbs_current ?? null,
				last_done_date: daysRemaining === null ? null : today,
				notes: newInterval.notes || '',
			};
			const created = await createAircraftInterval(id, payload);
			setIntervals((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
			setNewInterval({
				name: '',
				interval_type: 'hours',
				hours_remaining_input: '',
				days_remaining_input: '',
				notes: '',
			});
			return true;
		} catch (e) {
			setError(e?.message || 'Failed to create interval.');
			return false;
		} finally {
			setIsCreatingInterval(false);
		}
	};

	const handleDeleteInterval = async (intervalId) => {
		try {
			setSavingIntervalId(intervalId);
			setError('');
			await deleteAircraftInterval(intervalId);
			setIntervals((prev) => prev.filter((row) => row.id !== intervalId));
		} catch (e) {
			setError(e?.message || 'Failed to delete interval.');
		} finally {
			setSavingIntervalId(null);
		}
	};

	const openEditIntervalDialog = (row) => {
		setEditingIntervalId(row.id);
		setEditInterval({
			name: row.name || '',
			interval_type: row.interval_type || 'hours',
			hours_remaining_input:
				row.hours_remaining === null || row.hours_remaining === undefined
					? ''
					: String(row.hours_remaining),
			days_remaining_input:
				row.days_remaining === null || row.days_remaining === undefined
					? ''
					: String(row.days_remaining),
			notes: row.notes || '',
		});
		setIsEditDialogOpen(true);
	};

	const handleUpdateIntervalFromDialog = async () => {
		if (!editingIntervalId) return;
		if (!editInterval.name.trim()) {
			setError('Interval name is required.');
			return;
		}
		if (
			(editInterval.interval_type === 'hours' || editInterval.interval_type === 'both') &&
			editInterval.hours_remaining_input === ''
		) {
			setError('Hours remaining is required for hours/both intervals.');
			return;
		}
		if (
			(editInterval.interval_type === 'days' || editInterval.interval_type === 'both') &&
			editInterval.days_remaining_input === ''
		) {
			setError('Days remaining is required for days/both intervals.');
			return;
		}
		try {
			setSavingIntervalId(editingIntervalId);
			setError('');
			const today = new Date().toISOString().slice(0, 10);
			const hoursRemaining =
				editInterval.hours_remaining_input === '' ? null : Number(editInterval.hours_remaining_input);
			const daysRemaining =
				editInterval.days_remaining_input === '' ? null : Number(editInterval.days_remaining_input);
			const payload = {
				name: editInterval.name.trim(),
				interval_type: editInterval.interval_type,
				due_every_hours: hoursRemaining,
				due_every_days: daysRemaining,
				last_done_tach: hoursRemaining === null ? null : aircraft?.tach_current ?? null,
				last_done_hobbs: hoursRemaining === null ? null : aircraft?.hobbs_current ?? null,
				last_done_date: daysRemaining === null ? null : today,
				notes: editInterval.notes || '',
			};
			const updated = await updateAircraftInterval(editingIntervalId, payload);
			setIntervals((prev) =>
				prev.map((row) => (row.id === editingIntervalId ? { ...row, ...updated } : row))
			);
			setIsEditDialogOpen(false);
			setEditingIntervalId(null);
		} catch (e) {
			setError(e?.message || 'Failed to update interval.');
		} finally {
			setSavingIntervalId(null);
		}
	};

	const needsHours =
		newInterval.interval_type === 'hours' || newInterval.interval_type === 'both';
	const needsDays = newInterval.interval_type === 'days' || newInterval.interval_type === 'both';

	return (
		<Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Stack spacing={3}>
					<Box>
						<Typography variant="h4" sx={{ fontWeight: 800 }}>
							{aircraft?.registration_number || 'Aircraft Detail'}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{aircraft?.model || '—'} • {aircraft?.location || 'Unassigned location'}
						</Typography>
					</Box>

					{error ? <Alert severity="error">{error}</Alert> : null}
					{isLoading ? (
						<>
							<Skeleton variant="text" width={260} height={36} />
							<Skeleton variant="rectangular" height={180} />
							<Skeleton variant="rectangular" height={220} />
						</>
					) : null}

					{!isLoading && aircraft ? (
						<>
							<Grid container spacing={3}>
								<Grid item xs={12} md={6}>
									<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
										<CardContent>
											<Stack spacing={1}>
												<Typography variant="h6" sx={{ fontWeight: 700 }}>
													Aircraft Overview
												</Typography>
												<Typography variant="body2">Model: {aircraft.model || '—'}</Typography>
												<Typography variant="body2">Manufacturer: {aircraft.manufacturer || '—'}</Typography>
												<Typography variant="body2">Engine: {aircraft.engine_type || '—'}</Typography>
												<Typography variant="body2">Year: {aircraft.year_built || '—'}</Typography>
												<Typography variant="body2">Type: {aircraft.aircraft_type || '—'}</Typography>
												<Typography variant="body2">Tach/Hobbs: {aircraft.tach_current ?? '—'} / {aircraft.hobbs_current ?? '—'}</Typography>
												<Box>
													<Chip size="small" label={formatFleetStatusLabel(aircraft.fleet_status)} />
												</Box>
											</Stack>
										</CardContent>
									</Card>
								</Grid>
								<Grid item xs={12} md={6}>
									<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
										<CardContent>
											<Stack spacing={1}>
												<Typography variant="h6" sx={{ fontWeight: 700 }}>
													Linked Activity
												</Typography>
												<Typography variant="body2">
													Open Work Orders: {aircraft?.links?.open_workorders_count ?? 0}
													{' · '}
													<Link component={RouterLink} to={`/work-orders?aircraft=${aircraft.id}`}>
														Open records
													</Link>
												</Typography>
												<Typography variant="body2">
													Open Discrepancies: {aircraft?.links?.open_discrepancies_count ?? 0}
													{' · '}
													<Link component={RouterLink} to={`/maintenance?aircraft=${aircraft.id}`}>
														Open records
													</Link>
												</Typography>
												<Typography variant="body2">
													Recent Flights: {aircraft?.links?.recent_flights_count ?? 0}
													{' · '}
													<Link component={RouterLink} to={`/dispatcher-dashboard?aircraft=${aircraft.id}`}>
														Open records
													</Link>
												</Typography>
											</Stack>
										</CardContent>
									</Card>
								</Grid>
							</Grid>

							{specsEntries.length ? (
								<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
									<CardContent>
										<Stack spacing={2}>
											<Typography variant="h6" sx={{ fontWeight: 700 }}>
												Specifications
											</Typography>
											{specsEntries.map(([key, value]) => (
												<Typography key={key} variant="body2">
													{key}: {String(value)}
												</Typography>
											))}
										</Stack>
									</CardContent>
								</Card>
							) : null}

							<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
								<CardContent>
									<Stack spacing={2}>
										<Stack direction="row" justifyContent="space-between" alignItems="center">
											<Typography variant="h6" sx={{ fontWeight: 700 }}>
												Maintenance Intervals
											</Typography>
											{canEditDetail ? (
												<Button
													variant="contained"
													size="small"
													onClick={() => setIsCreateDialogOpen(true)}
												>
													Add Interval
												</Button>
											) : null}
										</Stack>
										{canEditDetail ? (
											null
										) : null}
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>Name</TableCell>
													<TableCell>Type</TableCell>
													<TableCell>Hours Remaining</TableCell>
													<TableCell>Days Remaining</TableCell>
													<TableCell>Compliance</TableCell>
													<TableCell>Notes</TableCell>
													{canEditDetail ? <TableCell>Actions</TableCell> : null}
												</TableRow>
											</TableHead>
											<TableBody>
												{intervals.map((row) => (
													<TableRow key={row.id}>
														<TableCell>{row.name}</TableCell>
														<TableCell>{row.interval_type}</TableCell>
														<TableCell>{row.hours_remaining ?? '—'}</TableCell>
														<TableCell>{row.days_remaining ?? '—'}</TableCell>
														<TableCell>
															<Chip
																size="small"
																color={intervalChip(row.compliance_status)}
																label={row.compliance_status || 'ok'}
															/>
														</TableCell>
														<TableCell sx={{ minWidth: 220 }}>
															{row.notes || '—'}
														</TableCell>
														{canEditDetail ? (
															<TableCell sx={{ whiteSpace: 'nowrap' }}>
																<Button
																	size="small"
																	variant="outlined"
																	onClick={() => openEditIntervalDialog(row)}
																	disabled={savingIntervalId === row.id}
																>
																	Edit
																</Button>
																<Button
																	size="small"
																	sx={{ ml: 1 }}
																	variant="contained"
																	onClick={() => handleCompleteInterval(row.id)}
																	disabled={savingIntervalId === row.id}
																>
																	Mark Complete
																</Button>
																<Button
																	size="small"
																	sx={{ ml: 1 }}
																	color="error"
																	variant="text"
																	onClick={() => handleDeleteInterval(row.id)}
																	disabled={savingIntervalId === row.id}
																>
																	Delete
																</Button>
															</TableCell>
														) : null}
													</TableRow>
												))}
												{intervals.length === 0 ? (
													<TableRow>
														<TableCell colSpan={canEditDetail ? 7 : 6} sx={{ color: 'text.secondary', py: 3 }}>
															No maintenance intervals found.
														</TableCell>
													</TableRow>
												) : null}
											</TableBody>
										</Table>
									</Stack>
								</CardContent>
							</Card>
						</>
					) : null}
				</Stack>
			</Container>
			<Dialog
				open={isCreateDialogOpen}
				onClose={() => {
					if (!isCreatingInterval) setIsCreateDialogOpen(false);
				}}
				fullWidth
				maxWidth="sm"
			>
				<DialogTitle>Add Maintenance Interval</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							size="small"
							label="Interval Name"
							value={newInterval.name}
							onChange={(e) => setNewInterval((prev) => ({ ...prev, name: e.target.value }))}
							fullWidth
						/>
						<TextField
							size="small"
							select
							label="Type"
							value={newInterval.interval_type}
							onChange={(e) =>
								setNewInterval((prev) => ({
									...prev,
									interval_type: e.target.value,
								}))
							}
							fullWidth
						>
							<MenuItem value="hours">hours</MenuItem>
							<MenuItem value="days">days</MenuItem>
							<MenuItem value="both">both</MenuItem>
						</TextField>
						{needsHours ? (
							<TextField
								size="small"
								type="number"
								label="Hours Remaining *"
								value={newInterval.hours_remaining_input}
								onChange={(e) =>
									setNewInterval((prev) => ({
										...prev,
										hours_remaining_input: e.target.value,
									}))
								}
								fullWidth
							/>
						) : null}
						{needsDays ? (
							<TextField
								size="small"
								type="number"
								label="Days Remaining *"
								value={newInterval.days_remaining_input}
								onChange={(e) =>
									setNewInterval((prev) => ({
										...prev,
										days_remaining_input: e.target.value,
									}))
								}
								fullWidth
							/>
						) : null}
						<TextField
							size="small"
							label="Notes"
							multiline
							minRows={3}
							value={newInterval.notes}
							onChange={(e) =>
								setNewInterval((prev) => ({
									...prev,
									notes: e.target.value,
								}))
							}
							fullWidth
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setIsCreateDialogOpen(false)} disabled={isCreatingInterval}>
						Cancel
					</Button>
					<Button
						variant="contained"
						onClick={async () => {
							const created = await handleCreateInterval();
							if (created) setIsCreateDialogOpen(false);
						}}
						disabled={isCreatingInterval}
					>
						Add Interval
					</Button>
				</DialogActions>
			</Dialog>
			<Dialog
				open={isEditDialogOpen}
				onClose={() => {
					if (!savingIntervalId) setIsEditDialogOpen(false);
				}}
				fullWidth
				maxWidth="sm"
			>
				<DialogTitle>Edit Maintenance Interval</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							size="small"
							label="Interval Name"
							value={editInterval.name}
							onChange={(e) => setEditInterval((prev) => ({ ...prev, name: e.target.value }))}
							fullWidth
						/>
						<TextField
							size="small"
							select
							label="Type"
							value={editInterval.interval_type}
							onChange={(e) =>
								setEditInterval((prev) => ({ ...prev, interval_type: e.target.value }))
							}
							fullWidth
						>
							<MenuItem value="hours">hours</MenuItem>
							<MenuItem value="days">days</MenuItem>
							<MenuItem value="both">both</MenuItem>
						</TextField>
						{editInterval.interval_type === 'hours' || editInterval.interval_type === 'both' ? (
							<TextField
								size="small"
								type="number"
								label="Hours Remaining *"
								value={editInterval.hours_remaining_input}
								onChange={(e) =>
									setEditInterval((prev) => ({
										...prev,
										hours_remaining_input: e.target.value,
									}))
								}
								fullWidth
							/>
						) : null}
						{editInterval.interval_type === 'days' || editInterval.interval_type === 'both' ? (
							<TextField
								size="small"
								type="number"
								label="Days Remaining *"
								value={editInterval.days_remaining_input}
								onChange={(e) =>
									setEditInterval((prev) => ({
										...prev,
										days_remaining_input: e.target.value,
									}))
								}
								fullWidth
							/>
						) : null}
						<TextField
							size="small"
							label="Notes"
							multiline
							minRows={3}
							value={editInterval.notes}
							onChange={(e) => setEditInterval((prev) => ({ ...prev, notes: e.target.value }))}
							fullWidth
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setIsEditDialogOpen(false)} disabled={Boolean(savingIntervalId)}>
						Cancel
					</Button>
					<Button
						variant="contained"
						onClick={handleUpdateIntervalFromDialog}
						disabled={Boolean(savingIntervalId)}
					>
						Save Changes
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default FleetDetailPage;
