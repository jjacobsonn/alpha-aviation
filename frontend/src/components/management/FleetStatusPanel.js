import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
	Box,
	Button,
	Card,
	CardContent,
	InputAdornment,
	MenuItem,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography,
	Chip,
	useMediaQuery,
	useTheme,
} from '@mui/material';
import AirplanemodeActiveOutlinedIcon from '@mui/icons-material/AirplanemodeActiveOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ScrollableTableContainer from '../ScrollableTableContainer';

const FILTER_OPTIONS = [
	{ value: 'all', label: 'All statuses' },
	{ value: 'available', label: 'Available (active)' },
	{ value: 'maintenance', label: 'Maintenance due' },
	{ value: 'grounded', label: 'Grounded / AOG' },
];

const SORT_OPTIONS = [
	{ value: 'tail_asc', label: 'Tail number (A–Z)' },
	{ value: 'status', label: 'Status' },
	{ value: 'open_wo_desc', label: 'Open work orders (high → low)' },
];

const STATUS_ORDER = { active: 0, maintenance_due: 1, aog: 2, grounded: 3 };

function normalizeFleetStatus(raw) {
	const s = (raw || 'active').trim();
	return ['active', 'maintenance_due', 'aog', 'grounded'].includes(s) ? s : 'active';
}

function matchesStatusFilter(fleetStatus, filterKey) {
	const s = normalizeFleetStatus(fleetStatus);
	if (filterKey === 'all') return true;
	if (filterKey === 'available') return s === 'active';
	if (filterKey === 'maintenance') return s === 'maintenance_due';
	if (filterKey === 'grounded') return s === 'aog' || s === 'grounded';
	return true;
}

function statusChipProps(fleetStatus) {
	const s = normalizeFleetStatus(fleetStatus);
	const map = {
		active: { label: 'Active', color: 'success' },
		maintenance_due: { label: 'Maint. due', color: 'warning' },
		aog: { label: 'AOG', color: 'error' },
		grounded: { label: 'Grounded', color: 'error' },
	};
	return map[s] || { label: s, color: 'default' };
}

/**
 * @param {{ aircraft: Array, openWoByAircraft: Record<number, number>, loading?: boolean }} props
 */
export default function FleetStatusPanel({ aircraft, openWoByAircraft, loading }) {
	const theme = useTheme();
	const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
	const navigate = useNavigate();
	const [filterKey, setFilterKey] = useState('all');
	const [sortKey, setSortKey] = useState('tail_asc');
	const [search, setSearch] = useState('');

	const rows = useMemo(() => {
		const list = Array.isArray(aircraft) ? [...aircraft] : [];
		const q = search.trim().toLowerCase();
		let filtered = list.filter((ac) => matchesStatusFilter(ac?.fleet_status, filterKey));
		if (q) {
			filtered = filtered.filter((ac) => {
				const tail = String(ac?.registration_number || '').toLowerCase();
				const model = String(ac?.model || '').toLowerCase();
				return tail.includes(q) || model.includes(q);
			});
		}
		const getOpen = (id) => openWoByAircraft?.[Number(id)] ?? 0;
		const sortFn = (a, b) => {
			if (sortKey === 'tail_asc') {
				return String(a.registration_number || '').localeCompare(
					String(b.registration_number || ''),
					undefined,
					{ numeric: true }
				);
			}
			if (sortKey === 'status') {
				const sa = STATUS_ORDER[normalizeFleetStatus(a?.fleet_status)] ?? 9;
				const sb = STATUS_ORDER[normalizeFleetStatus(b?.fleet_status)] ?? 9;
				if (sa !== sb) return sa - sb;
				return String(a.registration_number || '').localeCompare(
					String(b.registration_number || ''),
					undefined,
					{ numeric: true }
				);
			}
			if (sortKey === 'open_wo_desc') {
				const da = getOpen(a.id);
				const db = getOpen(b.id);
				if (db !== da) return db - da;
				return String(a.registration_number || '').localeCompare(
					String(b.registration_number || ''),
					undefined,
					{ numeric: true }
				);
			}
			return 0;
		};
		filtered.sort(sortFn);
		return filtered;
	}, [aircraft, filterKey, openWoByAircraft, search, sortKey]);

	const onRowGo = (id) => {
		if (id == null) return;
		navigate(`/fleet/${id}`);
	};

	return (
		<Card
			elevation={0}
			sx={{
				mb: 4,
				border: '1px solid',
				borderColor: 'divider',
			}}
		>
			<CardContent sx={{ p: { xs: 2, sm: 3 } }}>
				<Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
					<Stack direction="row" spacing={1} alignItems="center">
						<AirplanemodeActiveOutlinedIcon color="primary" />
						<Box>
							<Typography variant="h6" sx={{ fontWeight: 700 }}>
								Fleet status
							</Typography>
							<Typography variant="caption" color="text.secondary">
								All aircraft • click a row to open fleet detail
							</Typography>
						</Box>
					</Stack>
				</Stack>

				<Stack
					direction={{ xs: 'column', md: 'row' }}
					spacing={1.5}
					sx={{ mb: 2 }}
					alignItems={{ xs: 'stretch', md: 'center' }}
				>
					<TextField
						size="small"
						placeholder="Search tail or model…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						sx={{ flex: 1, minWidth: { md: 200 } }}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon fontSize="small" color="action" />
								</InputAdornment>
							),
						}}
					/>
					<TextField
						select
						size="small"
						label="Status"
						value={filterKey}
						onChange={(e) => setFilterKey(e.target.value)}
						sx={{ minWidth: { md: 200 } }}
					>
						{FILTER_OPTIONS.map((opt) => (
							<MenuItem key={opt.value} value={opt.value}>
								{opt.label}
							</MenuItem>
						))}
					</TextField>
					<TextField
						select
						size="small"
						label="Sort"
						value={sortKey}
						onChange={(e) => setSortKey(e.target.value)}
						sx={{ minWidth: { md: 220 } }}
					>
						{SORT_OPTIONS.map((opt) => (
							<MenuItem key={opt.value} value={opt.value}>
								{opt.label}
							</MenuItem>
						))}
					</TextField>
				</Stack>

				{loading ? (
					<Typography color="text.secondary">Loading aircraft…</Typography>
				) : rows.length === 0 ? (
					<Typography color="text.secondary">
						{Array.isArray(aircraft) && aircraft.length === 0
							? 'No aircraft in this organization.'
							: 'No aircraft match your filters.'}
					</Typography>
				) : isNarrow ? (
					<Stack spacing={1.5}>
						{rows.map((ac) => {
							const chip = statusChipProps(ac?.fleet_status);
							const openN = openWoByAircraft?.[Number(ac.id)] ?? 0;
							return (
								<Card
									key={ac.id}
									variant="outlined"
									sx={{ cursor: 'pointer' }}
									onClick={() => onRowGo(ac.id)}
								>
									<CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
										<Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
											<Box sx={{ minWidth: 0 }}>
												<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
													{ac.registration_number || '—'}
												</Typography>
												<Typography variant="body2" color="text.secondary" noWrap>
													{ac.model || '—'}
												</Typography>
												{ac.location ? (
													<Typography variant="caption" color="text.secondary" display="block">
														{ac.location}
													</Typography>
												) : null}
											</Box>
											<Stack alignItems="flex-end" spacing={0.75}>
												<Chip size="small" label={chip.label} color={chip.color} variant={chip.color === 'default' ? 'outlined' : 'filled'} />
												<Typography variant="caption" color="text.secondary">
													Open WOs: {openN}
												</Typography>
											</Stack>
										</Stack>
									</CardContent>
								</Card>
							);
						})}
					</Stack>
				) : (
					<ScrollableTableContainer minWidth={720} sx={{ maxHeight: 360, overflowY: 'auto' }}>
						<Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { whiteSpace: 'nowrap' } }}>
							<TableHead>
								<TableRow>
									<TableCell>Tail</TableCell>
									<TableCell>Model</TableCell>
									<TableCell>Location</TableCell>
									<TableCell>Status</TableCell>
									<TableCell align="right">Open WOs</TableCell>
									<TableCell align="right"> </TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{rows.map((ac) => {
									const chip = statusChipProps(ac?.fleet_status);
									const openN = openWoByAircraft?.[Number(ac.id)] ?? 0;
									return (
										<TableRow
											key={ac.id}
											hover
											sx={{ cursor: 'pointer' }}
											onClick={() => onRowGo(ac.id)}
										>
											<TableCell sx={{ fontWeight: 700 }}>{ac.registration_number || '—'}</TableCell>
											<TableCell>{ac.model || '—'}</TableCell>
											<TableCell>{ac.location || '—'}</TableCell>
											<TableCell>
												<Chip
													size="small"
													label={chip.label}
													color={chip.color}
													variant={chip.color === 'default' ? 'outlined' : 'filled'}
												/>
											</TableCell>
											<TableCell align="right">{openN}</TableCell>
											<TableCell align="right" onClick={(e) => e.stopPropagation()}>
												<Button size="small" onClick={() => onRowGo(ac.id)}>
													Open
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</ScrollableTableContainer>
				)}
			</CardContent>
		</Card>
	);
}
