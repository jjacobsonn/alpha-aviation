import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	Container,
	Grid,
	Link,
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

const FleetDetailPage = () => {
	const { id } = useParams();
	const { state } = useAppContext();
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [aircraft, setAircraft] = useState(null);
	const [intervals, setIntervals] = useState([]);
	const [savingIntervalId, setSavingIntervalId] = useState(null);
	const [intervalNotesDraft, setIntervalNotesDraft] = useState({});

	const userRole = state.user?.role;
	const canEditDetail =
		isPlatformAdmin(state.user) || ['owner', 'manager', 'mechanic'].includes(userRole);

	const hydrateIntervalDrafts = (rows) => {
		setIntervalNotesDraft(
			(rows || []).reduce((acc, row) => {
				acc[row.id] = row.notes || '';
				return acc;
			}, {})
		);
	};

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
				hydrateIntervalDrafts(rows);
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

	const handleSaveIntervalNotes = async (intervalId) => {
		try {
			setSavingIntervalId(intervalId);
			const payload = { notes: intervalNotesDraft[intervalId] ?? '' };
			const updated = await updateAircraftInterval(intervalId, payload);
			setIntervals((prev) =>
				prev.map((row) => (row.id === intervalId ? { ...row, ...updated } : row))
			);
		} catch (e) {
			setError(e?.message || 'Failed to update interval notes.');
		} finally {
			setSavingIntervalId(null);
		}
	};

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
			setIntervalNotesDraft((prev) => ({ ...prev, [intervalId]: updated?.notes || '' }));
		} catch (e) {
			setError(e?.message || 'Failed to complete interval.');
		} finally {
			setSavingIntervalId(null);
		}
	};

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
													<Chip size="small" label={aircraft.fleet_status || 'active'} />
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

							<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
								<CardContent>
									<Stack spacing={2}>
										<Typography variant="h6" sx={{ fontWeight: 700 }}>
											Specifications
										</Typography>
										{specsEntries.length ? (
											specsEntries.map(([key, value]) => (
												<Typography key={key} variant="body2">
													{key}: {String(value)}
												</Typography>
											))
										) : (
											<Typography variant="body2" color="text.secondary">
												No aircraft specs have been configured yet.
											</Typography>
										)}
									</Stack>
								</CardContent>
							</Card>

							<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
								<CardContent>
									<Stack spacing={2}>
										<Typography variant="h6" sx={{ fontWeight: 700 }}>
											Maintenance Intervals
										</Typography>
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
															{canEditDetail ? (
																<TextField
																	size="small"
																	fullWidth
																	value={intervalNotesDraft[row.id] ?? ''}
																	onChange={(e) =>
																		setIntervalNotesDraft((prev) => ({
																			...prev,
																			[row.id]: e.target.value,
																		}))
																	}
																/>
															) : (
																row.notes || '—'
															)}
														</TableCell>
														{canEditDetail ? (
															<TableCell sx={{ whiteSpace: 'nowrap' }}>
																<Button
																	size="small"
																	variant="outlined"
																	onClick={() => handleSaveIntervalNotes(row.id)}
																	disabled={savingIntervalId === row.id}
																>
																	Save
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
		</Box>
	);
};

export default FleetDetailPage;
