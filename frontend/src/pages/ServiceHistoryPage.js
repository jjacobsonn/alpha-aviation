import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
	Alert,
	Badge,
	Box,
	Button,
	Card,
	CardActionArea,
	CardContent,
	Chip,
	Container,
	IconButton,
	InputAdornment,
	MenuItem,
	Pagination,
	Popover,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TableSortLabel,
	TextField,
	Tooltip,
	Typography,
	useMediaQuery,
	useTheme,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import HistoryIcon from '@mui/icons-material/History';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import { fetchCompanyAircrafts, fetchServiceHistory } from '../shared/Api';
import WorkOrderHistoryViewer from '../components/history/WorkOrderHistoryViewer';
import { useAppContext } from '../context/AppContext';
import {
	canEditServiceHistory,
	canSuperviseMaintenance,
	getEffectiveCompanyRole,
	isPlatformAdmin,
} from '../shared/rbac';
import { workOrderHeadline, workOrderSourceLabel } from '../shared/workOrderDisplay';

const STATUS_OPTIONS = [
	{ value: 'all', label: 'All statuses' },
	{ value: 'closed', label: 'Closed' },
	{ value: 'open', label: 'Open' },
	{ value: 'in_progress', label: 'In Progress' },
	{ value: 'awaiting_parts', label: 'Awaiting Parts' },
];

const ORDER_FIELDS = {
	id: 'id',
	title: 'title',
	updated: '-updated_at',
	created: '-created_at',
	priority: 'priority',
	ata: 'ATA_code',
};

function formatStatus(s) {
	return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncate(str, max = 56) {
	const t = (str || '').trim();
	if (!t) return '—';
	if (t.length <= max) return t;
	return `${t.slice(0, max - 1)}…`;
}

const DEFAULT_FILTERS = {
	q: '',
	tail: '',
	aircraft_id: '',
	ata: '',
	component: '',
	status: 'all',
	date_from: '',
	date_to: '',
	ordering: '-updated_at',
	page: 1,
	page_size: 25,
};

function draftToSearchParams(draft) {
	const next = new URLSearchParams();
	Object.entries(draft).forEach(([key, val]) => {
		if (val === '' || val == null) return;
		if (key === 'page' && Number(val) === 1) return;
		if (key === 'page_size' && Number(val) === 25) return;
		if (key === 'ordering' && val === '-updated_at') return;
		next.set(key, String(val));
	});
	return next;
}

function HistoryFiltersBar({ draft, applied, setDraft, aircraft, onApply, onReset, isCompact }) {
	const [moreAnchor, setMoreAnchor] = useState(null);

	const advancedCount = [draft.ata, draft.component, draft.date_from, draft.date_to, draft.tail].filter(
		Boolean
	).length;

	const applyWith = (patch) => {
		const next = { ...draft, ...patch, page: 1 };
		setDraft(next);
		onApply(next);
	};

	const fieldSx = {
		'& .MuiOutlinedInput-root': { bgcolor: 'background.paper' },
	};

	return (
		<Stack spacing={1.25}>
			<Stack
				direction="row"
				spacing={1}
				alignItems="center"
				flexWrap="wrap"
				useFlexGap
				sx={{ rowGap: 1 }}
			>
				<TextField
					size="small"
					placeholder="Search title, tail, WO #…"
					value={draft.q}
					onChange={(e) => setDraft((s) => ({ ...s, q: e.target.value }))}
					onKeyDown={(e) => {
						if (e.key === 'Enter') applyWith({});
					}}
					sx={{
						...fieldSx,
						flex: { xs: '1 1 100%', sm: '1 1 220px' },
						minWidth: { xs: 0, sm: 200 },
					}}
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
					value={draft.aircraft_id}
					onChange={(e) => applyWith({ aircraft_id: e.target.value })}
					SelectProps={{
						displayEmpty: true,
						renderValue: (v) => {
							if (!v) return 'All aircraft';
							const ac = aircraft.find((a) => String(a.id) === String(v));
							return ac?.registration_number || 'Aircraft';
						},
					}}
					sx={{
						...fieldSx,
						flex: { xs: '1 1 calc(50% - 4px)', md: '0 0 auto' },
						minWidth: { xs: 0, md: 148 },
						width: { md: 148 },
					}}
				>
					<MenuItem value="">All aircraft</MenuItem>
					{aircraft.map((a) => (
						<MenuItem key={a.id} value={String(a.id)}>
							{a.registration_number}
						</MenuItem>
					))}
				</TextField>

				<TextField
					select
					size="small"
					value={draft.status}
					onChange={(e) => applyWith({ status: e.target.value })}
					sx={{
						...fieldSx,
						flex: { xs: '1 1 calc(50% - 4px)', md: '0 0 auto' },
						minWidth: { xs: 0, md: 132 },
						width: { md: 132 },
					}}
				>
					{STATUS_OPTIONS.map((o) => (
						<MenuItem key={o.value} value={o.value}>
							{o.label}
						</MenuItem>
					))}
				</TextField>

				<Tooltip title="ATA, component, date range">
					<IconButton
						size="small"
						onClick={(e) => setMoreAnchor(e.currentTarget)}
						sx={{
							border: '1px solid',
							borderColor: 'divider',
							borderRadius: 1,
							flexShrink: 0,
						}}
					>
						<Badge badgeContent={advancedCount > 0 ? advancedCount : undefined} color="primary">
							<FilterListIcon fontSize="small" />
						</Badge>
					</IconButton>
				</Tooltip>

				<Stack direction="row" spacing={0.75} sx={{ flexShrink: 0, ml: { md: 'auto' } }}>
					<Tooltip title="Clear filters">
						<IconButton size="small" onClick={onReset} aria-label="Reset filters">
							<RestartAltIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					<Button
						variant="contained"
						size="small"
						onClick={() => applyWith({})}
						startIcon={isCompact ? null : <SearchIcon />}
						sx={{ minWidth: { xs: 72, sm: 88 }, px: { xs: 1.5, sm: 2 } }}
					>
						Search
					</Button>
				</Stack>
			</Stack>

			<Popover
				open={Boolean(moreAnchor)}
				anchorEl={moreAnchor}
				onClose={() => setMoreAnchor(null)}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
				transformOrigin={{ vertical: 'top', horizontal: 'right' }}
				slotProps={{ paper: { sx: { p: 2, width: 300, maxWidth: 'calc(100vw - 32px)' } } }}
			>
				<Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
					More filters
				</Typography>
				<Stack spacing={1.5}>
					<TextField
						size="small"
						label="ATA chapter"
						placeholder="e.g. 32"
						value={draft.ata}
						onChange={(e) => setDraft((s) => ({ ...s, ata: e.target.value }))}
						fullWidth
					/>
					<TextField
						size="small"
						label="Affected systems"
						placeholder="e.g. COM1, landing gear"
						value={draft.component}
						onChange={(e) => setDraft((s) => ({ ...s, component: e.target.value }))}
						fullWidth
					/>
					<Stack direction="row" spacing={1}>
						<TextField
							size="small"
							type="date"
							label="From"
							InputLabelProps={{ shrink: true }}
							value={draft.date_from}
							onChange={(e) => setDraft((s) => ({ ...s, date_from: e.target.value }))}
							fullWidth
						/>
						<TextField
							size="small"
							type="date"
							label="To"
							InputLabelProps={{ shrink: true }}
							value={draft.date_to}
							onChange={(e) => setDraft((s) => ({ ...s, date_to: e.target.value }))}
							fullWidth
						/>
					</Stack>
					<Stack direction="row" spacing={1} justifyContent="flex-end">
						<Button
							size="small"
							onClick={() => {
								setDraft((s) => ({
									...s,
									ata: '',
									component: '',
									date_from: '',
									date_to: '',
									tail: '',
								}));
							}}
						>
							Clear
						</Button>
						<Button
							size="small"
							variant="contained"
							onClick={() => {
								applyWith({});
								setMoreAnchor(null);
							}}
						>
							Apply
						</Button>
					</Stack>
				</Stack>
			</Popover>

			{[applied.q, applied.aircraft_id, applied.status !== 'all' && applied.status, applied.ata, applied.component, applied.date_from, applied.date_to].some(Boolean) ? (
				<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
					{applied.q ? (
						<Chip
							size="small"
							label={`“${truncate(applied.q, 24)}”`}
							onDelete={() => applyWith({ q: '' })}
						/>
					) : null}
					{applied.aircraft_id ? (
						<Chip
							size="small"
							label={
								aircraft.find((a) => String(a.id) === String(applied.aircraft_id))?.registration_number
								|| 'Aircraft'
							}
							onDelete={() => applyWith({ aircraft_id: '' })}
						/>
					) : null}
					{applied.status && applied.status !== 'all' ? (
						<Chip
							size="small"
							label={STATUS_OPTIONS.find((o) => o.value === applied.status)?.label || applied.status}
							onDelete={() => applyWith({ status: 'all' })}
						/>
					) : null}
					{applied.ata ? (
						<Chip size="small" label={`ATA ${applied.ata}`} onDelete={() => applyWith({ ata: '' })} />
					) : null}
					{applied.component ? (
						<Chip
							size="small"
							label={`Systems: ${truncate(applied.component, 20)}`}
							onDelete={() => applyWith({ component: '' })}
						/>
					) : null}
					{applied.date_from ? (
						<Chip size="small" label={`From ${applied.date_from}`} onDelete={() => applyWith({ date_from: '' })} />
					) : null}
					{applied.date_to ? (
						<Chip size="small" label={`To ${applied.date_to}`} onDelete={() => applyWith({ date_to: '' })} />
					) : null}
				</Stack>
			) : null}
		</Stack>
	);
}

function HistoryResultCard({ row, onView }) {
	const sourceLabel = workOrderSourceLabel(row);
	return (
		<Card
			elevation={0}
			sx={{
				border: '1px solid',
				borderColor: 'divider',
				borderRadius: 2,
			}}
		>
			<CardActionArea onClick={onView}>
				<CardContent>
					<Stack spacing={1.25}>
						<Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
							<Box sx={{ minWidth: 0, flex: 1 }}>
								<Typography variant="caption" color="text.secondary">
									WO #{row.id} · {row.aircraft?.registration_number || '—'}
									{sourceLabel ? ` · ${sourceLabel}` : ''}
								</Typography>
								<Typography
									variant="subtitle1"
									sx={{ fontWeight: 700, lineHeight: 1.3 }}
									title={row.title || undefined}
								>
									{workOrderHeadline(row, 100)}
								</Typography>
							</Box>
							<Chip
								size="small"
								label={formatStatus(row.status)}
								color={row.status === 'closed' ? 'success' : 'warning'}
							/>
						</Stack>
						<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
							<Chip size="small" variant="outlined" label={`Priority: ${row.priority || '—'}`} />
							{row.ATA_code != null && row.ATA_code !== '' ? (
								<Chip size="small" variant="outlined" label={`ATA ${row.ATA_code}`} />
							) : null}
						</Stack>
						{row.parts_summary ? (
							<Typography variant="body2" color="text.secondary">
								{truncate(row.parts_summary, 100)}
							</Typography>
						) : null}
						<Stack spacing={0.25}>
							<Typography variant="caption" color="text.secondary">
								Assigned: {row.assignee_name || row.created_by_name || '—'}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Last edit: {row.last_edited_by || '—'}
								{row.updated_at
									? ` · ${new Date(row.updated_at).toLocaleDateString()}`
									: ''}
							</Typography>
						</Stack>
						<Button
							size="small"
							variant="outlined"
							sx={{ alignSelf: 'flex-start' }}
							onClick={(e) => {
								e.stopPropagation();
								onView();
							}}
						>
							View details
						</Button>
					</Stack>
				</CardContent>
			</CardActionArea>
		</Card>
	);
}

export default function ServiceHistoryPage() {
	const { state } = useAppContext();
	const effectiveRole = getEffectiveCompanyRole(state);
	const platformAdmin = isPlatformAdmin(state.user) && !state.viewAsUser;
	const superviseMaintenance = canSuperviseMaintenance(state);
	// Service history edits: owner/manager only (not mechanic/dispatcher).
	const canUpdateWorkOrder = canEditServiceHistory(state);
	const canDelete = effectiveRole === 'owner' || platformAdmin;

	const [searchParams, setSearchParams] = useSearchParams();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [data, setData] = useState({ count: 0, results: [] });
	const [aircraft, setAircraft] = useState([]);
	const [viewerId, setViewerId] = useState(null);

	const filters = useMemo(
		() => ({
			q: searchParams.get('q') || '',
			tail: searchParams.get('tail') || '',
			aircraft_id: searchParams.get('aircraft_id') || '',
			ata: searchParams.get('ata') || '',
			component: searchParams.get('component') || '',
			status: searchParams.get('status') || 'all',
			date_from: searchParams.get('date_from') || '',
			date_to: searchParams.get('date_to') || '',
			ordering: searchParams.get('ordering') || '-updated_at',
			page: Number(searchParams.get('page') || 1),
			page_size: Number(searchParams.get('page_size') || 25),
		}),
		[searchParams]
	);

	const [draft, setDraft] = useState(filters);

	useEffect(() => {
		setDraft(filters);
	}, [filters]);

	const load = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const params = {
				page: filters.page,
				page_size: filters.page_size,
				ordering: filters.ordering,
			};
			if (filters.q) params.q = filters.q;
			if (filters.tail) params.tail = filters.tail;
			if (filters.aircraft_id) params.aircraft_id = filters.aircraft_id;
			if (filters.ata) params.ata = filters.ata;
			if (filters.component) params.component = filters.component;
			if (filters.status && filters.status !== 'all') params.status = filters.status;
			if (filters.date_from) params.date_from = filters.date_from;
			if (filters.date_to) params.date_to = filters.date_to;

			const [history, aircraftList] = await Promise.all([
				fetchServiceHistory(params),
				fetchCompanyAircrafts(),
			]);
			setData(history);
			setAircraft(Array.isArray(aircraftList) ? aircraftList : []);
		} catch (e) {
			setError(e?.message || 'Failed to load service history.');
		} finally {
			setLoading(false);
		}
	}, [filters]);

	useEffect(() => {
		load();
	}, [load]);

	const applyFilters = useCallback(
		(nextDraft = draft) => {
			setSearchParams(draftToSearchParams(nextDraft), { replace: true });
		},
		[draft, setSearchParams]
	);

	const resetFilters = useCallback(() => {
		setDraft(DEFAULT_FILTERS);
		setSearchParams({}, { replace: true });
	}, [setSearchParams]);

	const handleSort = (fieldKey) => {
		const target = ORDER_FIELDS[fieldKey];
		if (!target) return;
		const current = filters.ordering;
		const flipped = target.startsWith('-')
			? target.slice(1)
			: `-${target}`;
		const nextOrdering = current === target ? flipped : target;
		const next = new URLSearchParams(searchParams);
		next.set('ordering', nextOrdering);
		next.set('page', '1');
		setSearchParams(next, { replace: true });
	};

	const sortDirection = (fieldKey) => {
		const target = ORDER_FIELDS[fieldKey];
		const alt = target.startsWith('-') ? target.slice(1) : `-${target}`;
		if (filters.ordering === target) return 'desc';
		if (filters.ordering === alt) return 'asc';
		return false;
	};

	const pageCount = Math.max(1, Math.ceil((data.count || 0) / filters.page_size));
	const theme = useTheme();
	const isCompact = useMediaQuery(theme.breakpoints.down('md'));

	return (
		<Container
			maxWidth="xl"
			disableGutters={isCompact}
			sx={{
				py: { xs: 2, sm: 3 },
				px: { xs: 1.5, sm: 2, md: 3 },
				width: '100%',
				maxWidth: '100%',
			}}
		>
			<Stack
				direction={{ xs: 'column', sm: 'row' }}
				spacing={1.5}
				alignItems={{ xs: 'flex-start', sm: 'center' }}
				sx={{ mb: { xs: 2, md: 3 } }}
			>
				<HistoryIcon color="primary" sx={{ fontSize: { xs: 28, sm: 32 } }} />
				<Box sx={{ minWidth: 0 }}>
					<Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', sm: '2rem' } }}>
						Service History
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Search work orders across your fleet. Filter by aircraft, status, or open more filters for ATA and dates.
					</Typography>
				</Box>
			</Stack>

			{error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

			<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 2 }}>
				<CardContent sx={{ py: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
					<HistoryFiltersBar
						draft={draft}
						applied={filters}
						setDraft={setDraft}
						aircraft={aircraft}
						onApply={applyFilters}
						onReset={resetFilters}
						isCompact={isCompact}
					/>
				</CardContent>
			</Card>

			<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
				<CardContent
					sx={{
						p: { xs: 1.5, sm: 0 },
						'&:last-child': { pb: { xs: 1.5, sm: 0 } },
					}}
				>
					{isCompact ? (
						<Stack spacing={1.5} sx={{ p: { xs: 0, sm: 0 } }}>
							{loading ? (
								<Typography align="center" color="text.secondary" sx={{ py: 4 }}>
									Loading…
								</Typography>
							) : null}
							{!loading && data.results?.length === 0 ? (
								<Typography align="center" color="text.secondary" sx={{ py: 4 }}>
									No work orders match your filters.
								</Typography>
							) : null}
							{!loading
								? data.results?.map((row) => (
										<HistoryResultCard
											key={row.id}
											row={row}
											onView={() => setViewerId(row.id)}
										/>
								  ))
								: null}
						</Stack>
					) : (
						<TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
							<Table size="small" sx={{ minWidth: 960 }}>
								<TableHead>
									<TableRow>
										<TableCell sortDirection={sortDirection('id')}>
											<TableSortLabel active={!!sortDirection('id')} direction={sortDirection('id') || 'asc'} onClick={() => handleSort('id')}>
												WO #
											</TableSortLabel>
										</TableCell>
										<TableCell sortDirection={sortDirection('title')}>
											<TableSortLabel active={!!sortDirection('title')} direction={sortDirection('title') || 'asc'} onClick={() => handleSort('title')}>
												Issue
											</TableSortLabel>
										</TableCell>
										<TableCell>Tail</TableCell>
										<TableCell sortDirection={sortDirection('ata')}>
											<TableSortLabel active={!!sortDirection('ata')} direction={sortDirection('ata') || 'asc'} onClick={() => handleSort('ata')}>
												ATA
											</TableSortLabel>
										</TableCell>
										<TableCell sx={{ display: { md: 'none', lg: 'table-cell' } }}>Parts</TableCell>
										<TableCell sx={{ display: { md: 'none', xl: 'table-cell' } }}>Assigned</TableCell>
										<TableCell sx={{ display: { md: 'none', xl: 'table-cell' } }}>Last edit by</TableCell>
										<TableCell sortDirection={sortDirection('priority')}>
											<TableSortLabel active={!!sortDirection('priority')} direction={sortDirection('priority') || 'asc'} onClick={() => handleSort('priority')}>
												Priority
											</TableSortLabel>
										</TableCell>
										<TableCell>Status</TableCell>
										<TableCell sortDirection={sortDirection('updated')}>
											<TableSortLabel active={!!sortDirection('updated')} direction={sortDirection('updated') || 'desc'} onClick={() => handleSort('updated')}>
												Updated
											</TableSortLabel>
										</TableCell>
										<TableCell align="right"> </TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{loading ? (
										<TableRow>
											<TableCell colSpan={11} align="center" sx={{ py: 4 }}>
												Loading…
											</TableCell>
										</TableRow>
									) : null}
									{!loading && data.results?.length === 0 ? (
										<TableRow>
											<TableCell colSpan={11} align="center" sx={{ py: 4 }}>
												No work orders match your filters.
											</TableCell>
										</TableRow>
									) : null}
									{!loading
										? data.results?.map((row) => (
												<TableRow
													key={row.id}
													hover
													sx={{ cursor: 'pointer' }}
													onClick={() => setViewerId(row.id)}
												>
													<TableCell>{row.id}</TableCell>
													<TableCell sx={{ maxWidth: 280 }} title={row.title || undefined}>
														{workOrderHeadline(row, 56)}
													</TableCell>
													<TableCell>
														{row.aircraft?.registration_number || '—'}
													</TableCell>
													<TableCell>{row.ATA_code ?? '—'}</TableCell>
													<TableCell sx={{ display: { md: 'none', lg: 'table-cell' }, maxWidth: 160 }}>
														{truncate(row.parts_summary || row.components_affected, 40)}
													</TableCell>
													<TableCell sx={{ display: { md: 'none', xl: 'table-cell' } }}>
														{row.assignee_name || row.created_by_name || '—'}
													</TableCell>
													<TableCell sx={{ display: { md: 'none', xl: 'table-cell' } }}>
														{row.last_edited_by || '—'}
													</TableCell>
													<TableCell>{row.priority || '—'}</TableCell>
													<TableCell>{formatStatus(row.status)}</TableCell>
													<TableCell>
														{row.updated_at
															? new Date(row.updated_at).toLocaleDateString()
															: '—'}
													</TableCell>
													<TableCell align="right" onClick={(e) => e.stopPropagation()}>
														<Button size="small" onClick={() => setViewerId(row.id)}>
															View
														</Button>
													</TableCell>
												</TableRow>
										  ))
										: null}
								</TableBody>
							</Table>
						</TableContainer>
					)}
					<Stack
						direction={{ xs: 'column', sm: 'row' }}
						justifyContent="space-between"
						alignItems={{ xs: 'stretch', sm: 'center' }}
						spacing={1.5}
						sx={{ px: { xs: 0, sm: 2 }, py: 2 }}
					>
						<Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
							{data.count ?? 0} result{(data.count ?? 0) === 1 ? '' : 's'}
						</Typography>
						<Pagination
							count={pageCount}
							page={filters.page}
							onChange={(_, p) => {
								const next = new URLSearchParams(searchParams);
								next.set('page', String(p));
								setSearchParams(next, { replace: true });
							}}
							color="primary"
							size={isCompact ? 'small' : 'medium'}
							siblingCount={isCompact ? 0 : 1}
							boundaryCount={isCompact ? 1 : 1}
							sx={{
								'& .MuiPagination-ul': {
									justifyContent: { xs: 'center', sm: 'flex-end' },
									flexWrap: 'wrap',
								},
							}}
						/>
					</Stack>
				</CardContent>
			</Card>

			<WorkOrderHistoryViewer
				workOrderId={viewerId}
				open={Boolean(viewerId)}
				onClose={() => setViewerId(null)}
				onChanged={load}
				canUpdate={canUpdateWorkOrder}
				canSupervise={superviseMaintenance}
				canDelete={canDelete}
				currentUserId={state.user?.id}
			/>
		</Container>
	);
}
