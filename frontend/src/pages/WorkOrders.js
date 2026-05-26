import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
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
	MenuItem,
	Pagination,
	Stack,
	Tab,
	Tabs,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TableContainer,
	TextField,
	Typography,
} from '@mui/material';
import {
	deleteWorkorder,
	fetchAircraft,
	fetchCompanyAircrafts,
	fetchCompanyDiscrepancies,
	fetchCompanyUsers,
	fetchCompanyWorkorders,
	fetchDiscrepancies,
	fetchParts,
	fetchProfiles,
	fetchWorkorders,
	updateWorkorder,
} from '../shared/Api';
import { useAppContext } from '../context/AppContext';
import {
	canDeleteWorkOrders,
	canSuperviseMaintenance,
	isMechanicRole,
	isPlatformAdmin,
} from '../shared/rbac';

const WO_STATUS_OPTIONS = [
	{ value: 'open', label: 'Open' },
	{ value: 'in_progress', label: 'In Progress' },
	{ value: 'awaiting_parts', label: 'Awaiting Parts' },
	{ value: 'closed', label: 'Closed' },
];

const WO_PRIORITY_OPTIONS = [
	{ value: 'low', label: 'Low' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'high', label: 'High' },
	{ value: 'critical', label: 'Critical' },
];

const EMPTY_EDIT_FORM = {
	title: '',
	aircraft: '',
	assignee: '',
	status: 'open',
	priority: 'medium',
	due_by: '',
	description: '',
	parts_needed: [],
};

function buildEditFormFromWorkOrder(wo) {
	const aircraftId =
		typeof wo?.aircraft === 'object' && wo?.aircraft != null ? wo.aircraft.id : wo?.aircraft ?? '';
	const assigneeRaw =
		typeof wo?.assignee === 'object' && wo?.assignee != null
			? wo.assignee.id
			: wo?.assignee ??
				(typeof wo?.created_by === 'object' && wo?.created_by != null
					? wo.created_by.id
					: wo?.created_by ?? '');
	const rawPartIds = Array.isArray(wo?.parts_needed)
		? wo.parts_needed.map((x) => (typeof x === 'object' && x?.id != null ? x.id : x))
		: [];
	return {
		title: wo?.title || '',
		aircraft: aircraftId === '' ? '' : String(aircraftId),
		assignee: assigneeRaw === '' ? '' : String(assigneeRaw),
		status: wo?.status || 'open',
		priority: wo?.priority || 'medium',
		due_by: wo?.due_by || '',
		description: wo?.description || '',
		parts_needed: rawPartIds.map(Number).filter((n) => Number.isFinite(n)),
	};
}

const STATUS_TABS = [
	{ key: 'all', label: 'All' },
	{ key: 'open', label: 'Open' },
	{ key: 'in_progress', label: 'In Progress' },
	{ key: 'awaiting_parts', label: 'Awaiting Parts' },
	{ key: 'closed', label: 'Closed' },
];

function statusLabel(value) {
	return String(value || 'open')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

function priorityColor(priority) {
	if (priority === 'critical') return 'error';
	if (priority === 'high') return 'warning';
	if (priority === 'medium') return 'info';
	return 'default';
}

const actionBtnSx = {
	borderRadius: 999,
	textTransform: 'none',
	fontWeight: 600,
	px: 1.5,
	py: 0.45,
	minHeight: 34,
	width: '100%',
};

function profileDisplayName(u) {
	if (!u) return '';
	const fn = (u.first_name || '').trim();
	const ln = (u.last_name || '').trim();
	return `${fn} ${ln}`.trim() || u.username || String(u.id);
}

export default function WorkOrders() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const { state } = useAppContext();
	const platformAdmin = isPlatformAdmin(state.user);
	const superviseMaintenance = canSuperviseMaintenance(state);
	const mechanicRole = isMechanicRole(state.user);
	const canEditWorkOrders = superviseMaintenance || mechanicRole || platformAdmin;
	const canDeleteWo = canDeleteWorkOrders(state);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [workOrders, setWorkOrders] = useState([]);
	const [aircraft, setAircraft] = useState([]);
	const [users, setUsers] = useState([]);
	const [discrepancies, setDiscrepancies] = useState([]);
	const [parts, setParts] = useState([]);
	const [activeStatus, setActiveStatus] = useState('all');
	const [search, setSearch] = useState('');
	const [companyFilter, setCompanyFilter] = useState('');
	const [assignOpen, setAssignOpen] = useState(false);
	const [assignTarget, setAssignTarget] = useState(null);
	const [assignUserId, setAssignUserId] = useState('');
	const [assignPriority, setAssignPriority] = useState('medium');
	const [editOpen, setEditOpen] = useState(false);
	const [editTargetId, setEditTargetId] = useState(null);
	const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const aircraftFilterFromQuery = searchParams.get('aircraft') || '';

	const unwrapList = (data) => {
		if (Array.isArray(data)) return data;
		if (data && Array.isArray(data.results)) return data.results;
		return [];
	};

	const load = async () => {
		setIsLoading(true);
		setError('');
		const requests = platformAdmin
			? [
					{ key: 'workOrders', fn: fetchWorkorders },
					{ key: 'aircraft', fn: fetchAircraft },
					{ key: 'users', fn: fetchProfiles },
					{ key: 'discrepancies', fn: fetchDiscrepancies },
					{ key: 'parts', fn: fetchParts },
			  ]
			: [
					{ key: 'workOrders', fn: fetchCompanyWorkorders },
					{ key: 'aircraft', fn: fetchCompanyAircrafts },
					{ key: 'users', fn: fetchCompanyUsers },
					{ key: 'discrepancies', fn: fetchCompanyDiscrepancies },
					{ key: 'parts', fn: fetchParts },
			  ];

		const results = await Promise.allSettled(requests.map((r) => r.fn()));
		const byKey = {};
		const errors = [];
		results.forEach((result, idx) => {
			const { key } = requests[idx];
			if (result.status === 'fulfilled') {
				byKey[key] = result.value;
			} else {
				errors.push(key);
				byKey[key] = null;
			}
		});

		setWorkOrders(unwrapList(byKey.workOrders));
		setAircraft(unwrapList(byKey.aircraft));
		setUsers(unwrapList(byKey.users));
		setDiscrepancies(unwrapList(byKey.discrepancies));
		setParts(unwrapList(byKey.parts));

		if (errors.length && !unwrapList(byKey.workOrders).length) {
			setError('Failed to load work orders. Check that the API is running and you are logged in.');
		} else if (errors.length) {
			setError(`Some related data did not load (${errors.join(', ')}). Work orders are shown below.`);
		} else {
			setError('');
		}
		setIsLoading(false);
	};

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [platformAdmin]);

	const aircraftById = useMemo(() => {
		const map = new Map();
		aircraft.forEach((a) => map.set(Number(a.id), a));
		return map;
	}, [aircraft]);

	const userById = useMemo(() => {
		const map = new Map();
		users.forEach((u) => map.set(Number(u.id), u));
		return map;
	}, [users]);

	const discrepancyCountByWO = useMemo(() => {
		const map = new Map();
		discrepancies.forEach((d) => {
			const woRef = d?.work_order;
			const woId = typeof woRef === 'object' && woRef != null ? woRef.id : woRef;
			if (woId == null || woId === '') return;
			const key = Number(woId);
			map.set(key, (map.get(key) || 0) + 1);
		});
		return map;
	}, [discrepancies]);

	const partLabelById = useMemo(() => {
		const map = new Map();
		parts.forEach((p) => map.set(Number(p.id), `${p.part_number} — ${p.name}`));
		return map;
	}, [parts]);

	const companyOptions = useMemo(() => {
		const unique = new Map();
		aircraft.forEach((a) => {
			if (a?.company != null) {
				unique.set(String(a.company), a.company_name || `Company ${a.company}`);
			}
		});
		return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
	}, [aircraft]);

	const normalized = useMemo(
		() =>
			workOrders.map((wo) => {
				const aircraftRef = typeof wo.aircraft === 'object' && wo.aircraft != null ? wo.aircraft : null;
				const aircraftId = Number(aircraftRef?.id ?? wo.aircraft);
				const ac = aircraftRef || aircraftById.get(aircraftId) || null;
				const assigneeRef =
					typeof wo.assignee === 'object' && wo.assignee != null
						? wo.assignee
						: typeof wo.created_by === 'object' && wo.created_by != null
							? wo.created_by
							: null;
				const assigneeRaw = assigneeRef?.id ?? wo.assignee ?? wo.created_by;
				const assigneeId = Number(assigneeRaw);
				const assignee = assigneeRef || userById.get(assigneeId) || null;
				return {
					...wo,
					aircraftId,
					aircraftLabel: ac
						? `${ac.registration_number || ''} ${ac.model || ''}`.trim() || `Aircraft ${ac.id}`
						: String(wo.aircraft || '—'),
					companyId: ac?.company != null ? String(ac.company) : '',
					companyName: ac?.company_name || '',
					assigneeId: Number.isFinite(assigneeId) ? assigneeId : null,
					assigneeLabel: profileDisplayName(assignee) || 'Unassigned',
					partsCount: Array.isArray(wo.parts_needed) ? wo.parts_needed.length : 0,
					partsSummary: Array.isArray(wo.parts_needed)
						? wo.parts_needed
								.map((raw) => {
									const pid = typeof raw === 'object' && raw != null ? raw.id : raw;
									return partLabelById.get(Number(pid)) || `#${pid}`;
								})
								.join(', ')
						: '',
					discrepancyCount: discrepancyCountByWO.get(Number(wo.id)) || 0,
				};
			}),
		[workOrders, aircraftById, userById, discrepancyCountByWO, partLabelById]
	);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return normalized.filter((wo) => {
			if (activeStatus !== 'all' && (wo.status || 'open') !== activeStatus) return false;
			if (platformAdmin && companyFilter && wo.companyId !== companyFilter) return false;
			if (aircraftFilterFromQuery && String(wo.aircraftId) !== String(aircraftFilterFromQuery)) return false;
			if (!q) return true;
			const hay = [
				String(wo.id || ''),
				wo.title || '',
				wo.aircraftLabel || '',
				wo.assigneeLabel || '',
				wo.description || '',
			]
				.join(' ')
				.toLowerCase();
			return hay.includes(q);
		});
	}, [normalized, activeStatus, search, platformAdmin, companyFilter, aircraftFilterFromQuery]);

	const statusCounts = useMemo(() => {
		const counts = { all: normalized.length, open: 0, in_progress: 0, awaiting_parts: 0, closed: 0 };
		normalized.forEach((wo) => {
			const key = wo.status || 'open';
			if (counts[key] == null) counts[key] = 0;
			counts[key] += 1;
		});
		return counts;
	}, [normalized]);

	const assignableUsers = useMemo(
		() => users.filter((u) => ['mechanic', 'manager', 'owner'].includes(u?.company_role)),
		[users]
	);

	const editTargetWo = useMemo(
		() => workOrders.find((w) => Number(w.id) === Number(editTargetId)) || null,
		[workOrders, editTargetId]
	);

	const partsForEditAircraft = useMemo(() => {
		const aid = editForm.aircraft === '' ? null : Number(editForm.aircraft);
		if (!Number.isFinite(aid)) return [];
		return parts.filter((p) => {
			const pAc = p?.aircraft;
			const pAid =
				typeof pAc === 'object' && pAc != null ? Number(pAc.id) : Number(pAc);
			return Number.isFinite(pAid) && pAid === aid;
		});
	}, [parts, editForm.aircraft]);

	const openAssignDialog = (wo) => {
		setAssignTarget(wo);
		setAssignUserId(wo?.assigneeId ? String(wo.assigneeId) : '');
		setAssignPriority(wo?.priority || 'medium');
		setAssignOpen(true);
	};

	const closeAssignDialog = () => {
		setAssignOpen(false);
		setAssignTarget(null);
		setAssignUserId('');
		setAssignPriority('medium');
	};

	const saveAssignment = async () => {
		if (!assignTarget?.id) return;
		setIsSubmitting(true);
		setError('');
		try {
			await updateWorkorder(assignTarget.id, {
				created_by: assignUserId ? Number(assignUserId) : null,
				priority: assignPriority,
			});
			closeAssignDialog();
			await load();
		} catch (e) {
			setError(e?.message || 'Failed to update assignment.');
		} finally {
			setIsSubmitting(false);
		}
	};

	const quickStatus = async (wo, status) => {
		setError('');
		try {
			await updateWorkorder(wo.id, { status });
			await load();
		} catch (e) {
			setError(e?.message || 'Failed to update work order status.');
		}
	};

	const openEditDialog = (wo) => {
		const raw = workOrders.find((w) => Number(w.id) === Number(wo.id)) || wo;
		setEditTargetId(raw.id);
		setEditForm(buildEditFormFromWorkOrder(raw));
		setEditOpen(true);
	};

	const closeEditDialog = () => {
		setEditOpen(false);
		setEditTargetId(null);
		setEditForm(EMPTY_EDIT_FORM);
	};

	const saveEditDialog = async () => {
		if (!editTargetId) return;
		setIsSubmitting(true);
		setError('');
		try {
			let payload;
			if (superviseMaintenance) {
				payload = {
					title: editForm.title,
					aircraft: Number(editForm.aircraft),
					description: editForm.description,
					status: editForm.status,
					priority: editForm.priority,
					due_by: editForm.due_by || null,
					parts_needed: (editForm.parts_needed || []).map(Number),
				};
				const assigneeId = editForm.assignee ? Number(editForm.assignee) : null;
				payload.assignee = assigneeId;
				payload.created_by = assigneeId;
			} else {
				payload = {
					status: editForm.status,
					priority: editForm.priority,
					due_by: editForm.due_by || null,
					description: editForm.description,
					parts_needed: (editForm.parts_needed || []).map(Number),
				};
			}
			await updateWorkorder(editTargetId, payload);
			closeEditDialog();
			await load();
		} catch (e) {
			setError(e?.message || 'Failed to update work order.');
		} finally {
			setIsSubmitting(false);
		}
	};

	useEffect(() => {
		const woParam = searchParams.get('wo');
		if (isLoading || !woParam || !workOrders.length) return;
		const woId = Number(woParam);
		const wo = workOrders.find((w) => Number(w.id) === woId);
		if (!wo) return;
		if (searchParams.get('edit') === '1' && canEditWorkOrders) {
			openEditDialog(wo);
		}
		const next = new URLSearchParams(searchParams);
		next.delete('wo');
		next.delete('edit');
		setSearchParams(next, { replace: true });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoading, workOrders, searchParams]);

	const quickDelete = async (wo) => {
		if (!canDeleteWo) {
			setError('Only owners can delete work orders.');
			return;
		}
		setError('');
		try {
			await deleteWorkorder(wo.id);
			await load();
		} catch (e) {
			setError(e?.message || 'Failed to delete work order.');
		}
	};

	const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
	const pagedRows = useMemo(
		() => filtered.slice((page - 1) * pageSize, page * pageSize),
		[filtered, page, pageSize]
	);

	useEffect(() => {
		setPage(1);
	}, [activeStatus, search, companyFilter, pageSize]);

	useEffect(() => {
		if (page > pageCount) setPage(pageCount);
	}, [page, pageCount]);

	const exportCsv = () => {
		const rows = filtered.map((wo) => [
			wo.id,
			`"${String(wo.title || '').replace(/"/g, '""')}"`,
			`"${String(wo.aircraftLabel || '').replace(/"/g, '""')}"`,
			`"${String(wo.companyName || '').replace(/"/g, '""')}"`,
			`"${String(wo.assigneeLabel || '').replace(/"/g, '""')}"`,
			wo.status || '',
			wo.priority || '',
			wo.due_by || '',
			wo.updated_at || '',
			wo.partsCount,
			wo.discrepancyCount,
		]);
		const header = [
			'id',
			'title',
			'aircraft',
			'company',
			'assignee',
			'status',
			'priority',
			'due_by',
			'updated_at',
			'parts_count',
			'discrepancy_count',
		];
		const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `work-orders-${activeStatus}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
					<Box>
						<Typography variant="h4" sx={{ fontWeight: 800 }}>Work Orders</Typography>
						<Typography variant="body2" color="text.secondary">
							Company work order operations with status workflow, assignment, and review actions.
						</Typography>
					</Box>
					<Button variant="outlined" onClick={() => navigate('/maintenance')}>
						Open maintenance
					</Button>
				</Stack>
				{aircraftFilterFromQuery ? (
					<Stack direction="row" sx={{ mb: 2 }}>
						<Chip
							color="primary"
							variant="outlined"
							label={`Aircraft filter: ${aircraftFilterFromQuery}`}
							onDelete={() => {
								const next = new URLSearchParams(searchParams);
								next.delete('aircraft');
								setSearchParams(next, { replace: true });
							}}
						/>
					</Stack>
				) : null}

				{error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

				<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
					<CardContent>
						<Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
							<Tabs value={activeStatus} onChange={(_, next) => setActiveStatus(next)} variant="standard">
								{STATUS_TABS.map((tab) => (
									<Tab
										key={tab.key}
										value={tab.key}
										label={`${tab.label} (${statusCounts[tab.key] || 0})`}
									/>
								))}
							</Tabs>
							<Box sx={{ flexGrow: 1 }} />
							<TextField
								size="small"
								label="Search"
								placeholder="ID, title, aircraft, assignee"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								sx={{ minWidth: 260 }}
							/>
							{platformAdmin ? (
								<TextField
									select
									size="small"
									label="Company"
									value={companyFilter}
									onChange={(e) => setCompanyFilter(e.target.value)}
									sx={{ minWidth: 220 }}
								>
									<MenuItem value="">All companies</MenuItem>
									{companyOptions.map((c) => (
										<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
									))}
								</TextField>
							) : null}
							<Button size="small" variant="outlined" onClick={exportCsv}>
								Export CSV
							</Button>
						</Stack>
					</CardContent>
				</Card>

				<Grid container spacing={3}>
					<Grid item xs={12}>
						<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
							<CardContent>
								<Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
									{activeStatus === 'all' ? 'All work orders' : `${statusLabel(activeStatus)} table`}
								</Typography>
								{isLoading ? (
									<Typography color="text.secondary">Loading…</Typography>
								) : filtered.length === 0 ? (
									<Typography color="text.secondary">No work orders match the current filters.</Typography>
								) : (
									<TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
										<Table size="small" sx={{ minWidth: 1300 }}>
											<TableHead>
												<TableRow>
													<TableCell>ID</TableCell>
												<TableCell>Parts</TableCell>
													<TableCell>Aircraft</TableCell>
													<TableCell>Company</TableCell>
													<TableCell>Assignee</TableCell>
													<TableCell>Status</TableCell>
													<TableCell>Due</TableCell>
													<TableCell>Priority</TableCell>
													<TableCell>Updated</TableCell>
												<TableCell>Description</TableCell>
													<TableCell>Discrepancies</TableCell>
													<TableCell>Actions</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{pagedRows.map((wo) => (
													<TableRow key={wo.id}>
														<TableCell>{wo.id}</TableCell>
														<TableCell sx={{ minWidth: 240, maxWidth: 320, whiteSpace: 'normal' }}>{wo.partsSummary || '—'}</TableCell>
														<TableCell sx={{ minWidth: 160 }}>{wo.aircraftLabel}</TableCell>
														<TableCell sx={{ minWidth: 150 }}>
															<Chip size="small" variant="outlined" label={wo.companyName || '—'} />
														</TableCell>
														<TableCell sx={{ minWidth: 150 }}>
															<Chip size="small" label={wo.assigneeLabel} />
														</TableCell>
														<TableCell sx={{ minWidth: 120 }}><Chip size="small" label={statusLabel(wo.status)} /></TableCell>
														<TableCell sx={{ minWidth: 120 }}>{wo.due_by || '—'}</TableCell>
														<TableCell sx={{ minWidth: 120 }}>
															<Chip size="small" color={priorityColor(wo.priority)} label={statusLabel(wo.priority || 'medium')} />
														</TableCell>
														<TableCell sx={{ minWidth: 190 }}>{wo.updated_at ? new Date(wo.updated_at).toLocaleString() : '—'}</TableCell>
														<TableCell sx={{ minWidth: 300, maxWidth: 420, whiteSpace: 'normal' }}>{wo.description || wo.title || '—'}</TableCell>
														<TableCell sx={{ minWidth: 100 }}>{wo.discrepancyCount}</TableCell>
														<TableCell sx={{ minWidth: 420 }}>
															<Box
																sx={{
																	display: 'grid',
																	gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
																	gap: 1,
																	alignItems: 'stretch',
																}}
															>
																<Button size="small" variant="contained" sx={actionBtnSx} onClick={() => navigate(`/maintenance?wo=${wo.id}`)}>View</Button>
																<Button
																	size="small"
																	variant="contained"
																	sx={actionBtnSx}
																	disabled={!canEditWorkOrders}
																	onClick={() => openEditDialog(wo)}
																>
																	Edit
																</Button>
																{superviseMaintenance ? (
																	<Button size="small" variant="contained" sx={actionBtnSx} onClick={() => openAssignDialog(wo)}>Assign/Reassign</Button>
																) : null}
																{wo.status === 'open' ? (
																	<Button size="small" variant="contained" color="success" sx={actionBtnSx} onClick={() => quickStatus(wo, 'in_progress')}>Start</Button>
																) : null}
																{wo.status === 'in_progress' ? (
																	<Button size="small" variant="contained" color="warning" sx={actionBtnSx} onClick={() => quickStatus(wo, 'awaiting_parts')}>Awaiting Parts</Button>
																) : null}
																{wo.status !== 'closed' ? (
																	<Button size="small" variant="contained" color="secondary" sx={actionBtnSx} onClick={() => quickStatus(wo, 'closed')}>Close</Button>
																) : null}
																{canDeleteWo ? (
																	<Button size="small" variant="contained" color="error" sx={actionBtnSx} onClick={() => quickDelete(wo)}>Delete</Button>
																) : null}
															</Box>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								)}
								{filtered.length > 0 ? (
									<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
										<TextField
											select
											size="small"
											label="Rows"
											value={String(pageSize)}
											onChange={(e) => setPageSize(Number(e.target.value))}
											sx={{ width: 110 }}
										>
											<MenuItem value="10">10</MenuItem>
											<MenuItem value="20">20</MenuItem>
											<MenuItem value="50">50</MenuItem>
										</TextField>
										<Pagination
											page={page}
											count={pageCount}
											onChange={(_, p) => setPage(p)}
											size="small"
											sx={{
												'& .MuiPaginationItem-root.Mui-selected': {
													backgroundColor: 'rgba(39, 52, 105, 0.14)',
													color: '#273469',
												},
											}}
										/>
									</Stack>
								) : null}
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				<Dialog open={editOpen} onClose={closeEditDialog} fullWidth maxWidth="sm">
					<DialogTitle>
						Edit work order
						{editTargetWo?.id != null ? ` #${editTargetWo.id}` : ''}
					</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							{superviseMaintenance ? (
								<>
									<TextField
										label="Title"
										value={editForm.title}
										onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))}
										fullWidth
									/>
									<TextField
										select
										label="Aircraft"
										value={editForm.aircraft}
										onChange={(e) => {
											const nextAc = e.target.value;
											setEditForm((s) => {
												const aid = nextAc === '' ? null : Number(nextAc);
												const nextParts = (s.parts_needed || []).filter((pid) => {
													const p = parts.find((x) => Number(x.id) === Number(pid));
													if (!p) return false;
													const pAc = p.aircraft;
													const pAid =
														typeof pAc === 'object' && pAc != null
															? Number(pAc.id)
															: Number(pAc);
													return Number.isFinite(pAid) && pAid === aid;
												});
												return { ...s, aircraft: nextAc, parts_needed: nextParts };
											});
										}}
										fullWidth
									>
										{aircraft.map((a) => (
											<MenuItem key={a.id} value={String(a.id)}>
												{a.registration_number} ({a.model})
											</MenuItem>
										))}
									</TextField>
									<TextField
										select
										label="Assigned to"
										value={editForm.assignee}
										onChange={(e) => setEditForm((s) => ({ ...s, assignee: e.target.value }))}
										fullWidth
									>
										<MenuItem value="">Unassigned</MenuItem>
										{assignableUsers.map((u) => (
											<MenuItem key={u.id} value={String(u.id)}>
												{profileDisplayName(u)}
											</MenuItem>
										))}
									</TextField>
								</>
							) : null}
							<TextField
								select
								label="Status"
								value={editForm.status}
								onChange={(e) => setEditForm((s) => ({ ...s, status: e.target.value }))}
								fullWidth
							>
								{WO_STATUS_OPTIONS.map((opt) => (
									<MenuItem key={opt.value} value={opt.value}>
										{opt.label}
									</MenuItem>
								))}
							</TextField>
							<TextField
								select
								label="Priority"
								value={editForm.priority}
								onChange={(e) => setEditForm((s) => ({ ...s, priority: e.target.value }))}
								fullWidth
							>
								{WO_PRIORITY_OPTIONS.map((opt) => (
									<MenuItem key={opt.value} value={opt.value}>
										{opt.label}
									</MenuItem>
								))}
							</TextField>
							<TextField
								type="date"
								label="Due date"
								InputLabelProps={{ shrink: true }}
								value={editForm.due_by}
								onChange={(e) => setEditForm((s) => ({ ...s, due_by: e.target.value }))}
								fullWidth
							/>
							{superviseMaintenance ? (
								<TextField
									select
									label="Parts needed"
									SelectProps={{
										multiple: true,
										renderValue: (selected) =>
											(selected || []).length
												? (selected || [])
														.map((id) => {
															const p = parts.find((x) => Number(x.id) === Number(id));
															return p ? `${p.part_number} — ${p.name}` : `#${id}`;
														})
														.join(', ')
												: '—',
									}}
									value={editForm.parts_needed || []}
									onChange={(e) =>
										setEditForm((s) => ({
											...s,
											parts_needed:
												typeof e.target.value === 'string'
													? e.target.value.split(',').map(Number)
													: e.target.value,
										}))
									}
									disabled={!editForm.aircraft}
									helperText={
										!editForm.aircraft
											? 'Select an aircraft first'
											: partsForEditAircraft.length === 0
												? 'No parts for this aircraft'
												: undefined
									}
									fullWidth
								>
									{partsForEditAircraft.map((p) => (
										<MenuItem key={p.id} value={p.id}>
											{p.part_number} — {p.name}
										</MenuItem>
									))}
								</TextField>
							) : null}
							<TextField
								label="Description"
								multiline
								minRows={3}
								value={editForm.description}
								onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))}
								fullWidth
							/>
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={closeEditDialog}>Cancel</Button>
						<Button variant="contained" onClick={saveEditDialog} disabled={isSubmitting}>
							Save
						</Button>
					</DialogActions>
				</Dialog>

				<Dialog open={assignOpen} onClose={closeAssignDialog} fullWidth maxWidth="xs">
					<DialogTitle>Assign work order</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Typography variant="body2" color="text.secondary">
								#{assignTarget?.id} — {assignTarget?.title || 'Untitled'}
							</Typography>
							<TextField
								select
								label="Assignee"
								value={assignUserId}
								onChange={(e) => setAssignUserId(e.target.value)}
								fullWidth
							>
								<MenuItem value="">Unassigned</MenuItem>
								{assignableUsers.map((u) => (
									<MenuItem key={u.id} value={u.id}>{profileDisplayName(u)}</MenuItem>
								))}
							</TextField>
							<TextField
								select
								label="Priority"
								value={assignPriority}
								onChange={(e) => setAssignPriority(e.target.value)}
								fullWidth
							>
								<MenuItem value="low">Low</MenuItem>
								<MenuItem value="medium">Medium</MenuItem>
								<MenuItem value="high">High</MenuItem>
								<MenuItem value="critical">Critical</MenuItem>
							</TextField>
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={closeAssignDialog}>Cancel</Button>
						<Button variant="contained" onClick={saveAssignment} disabled={isSubmitting}>
							Save
						</Button>
					</DialogActions>
				</Dialog>
			</Container>
		</Box>
	);
}
