import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { downloadClientCsv } from '../shared/csvExport';
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
	Stack,
	Tab,
	Tabs,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography,
	Divider,
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
import ScrollableTableContainer from '../components/ScrollableTableContainer';
import TablePaginationBar from '../components/TablePaginationBar';
import { useTablePagination } from '../shared/useTablePagination';
import {
	canDeleteWorkOrders,
	canSuperviseMaintenance,
	canUpdateWorkOrders,
	getEffectiveCompanyRole,
	isPlatformAdmin,
	allowedRolesForModule,
} from '../shared/rbac';
import {
	companyFleetParts,
	filterPartIdsForAircraft,
	partsForWorkOrderAircraft,
} from '../shared/workOrderParts';
import {
	formatActivitySummaryLines,
	formatActivityTimestamp,
} from '../shared/activitySummaryFormat';

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

function profileDisplayName(u) {
	if (!u) return '';
	const fn = (u.first_name || '').trim();
	const ln = (u.last_name || '').trim();
	return `${fn} ${ln}`.trim() || u.username || String(u.id);
}

function WorkOrderActivityLog({ activities, emptyMessage = 'No activity recorded yet.' }) {
	const items = Array.isArray(activities) ? activities : [];
	if (!items.length) {
		return (
			<Typography variant="body2" color="text.secondary">
				{emptyMessage}
			</Typography>
		);
	}
	return (
		<Stack spacing={1}>
			{items.map((a) => {
				const changeLines = formatActivitySummaryLines(a.summary);
				return (
					<Box
						key={a.id ?? `${a.created_at}-${a.summary}`}
						sx={{
							pl: 1.25,
							py: 0.75,
							borderLeft: '2px solid',
							borderColor: 'primary.light',
						}}
					>
						<Typography variant="body2" sx={{ fontWeight: 700 }}>
							{a.actor_display || 'System'}
						</Typography>
						<Typography variant="caption" color="text.secondary" display="block">
							{formatActivityTimestamp(a.created_at)}
							{a.event_type ? ` · ${statusLabel(a.event_type)}` : ''}
						</Typography>
						{changeLines.length > 0 ? (
							<Stack spacing={0.5} sx={{ mt: 0.5 }}>
								{changeLines.map((line) => (
									<Typography key={line} variant="body2" sx={{ lineHeight: 1.45 }}>
										{line}
									</Typography>
								))}
							</Stack>
						) : (
							<Typography variant="body2" sx={{ mt: 0.5 }}>
								{a.summary || '—'}
							</Typography>
						)}
					</Box>
				);
			})}
		</Stack>
	);
}

export default function WorkOrders() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const { state } = useAppContext();
	const platformAdmin = isPlatformAdmin(state.user);
	const superviseMaintenance = canSuperviseMaintenance(state);
	const canUpdateWo = canUpdateWorkOrders(state);
	const canAssignWorkOrders = superviseMaintenance || platformAdmin;
	const canDeleteWo = canDeleteWorkOrders(state);
	const canAccessMaintenance = useMemo(() => {
		if (platformAdmin && !state.viewAsUser) return true;
		const role = getEffectiveCompanyRole(state);
		return allowedRolesForModule('maintenance').includes(role);
	}, [state, platformAdmin]);
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
	const [viewOpen, setViewOpen] = useState(false);
	const [viewTarget, setViewTarget] = useState(null);
	const [editTargetId, setEditTargetId] = useState(null);
	const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
	const [isSubmitting, setIsSubmitting] = useState(false);
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

	useEffect(() => {
		if (!viewOpen || viewTarget?.id == null) return;
		const fresh = normalized.find((w) => Number(w.id) === Number(viewTarget.id));
		if (fresh) setViewTarget(fresh);
	}, [normalized, viewOpen, viewTarget?.id]);

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

	const fleetParts = useMemo(() => companyFleetParts(parts, aircraft), [parts, aircraft]);

	const partsForEditAircraft = useMemo(
		() => partsForWorkOrderAircraft(parts, aircraft, editForm.aircraft),
		[parts, aircraft, editForm.aircraft]
	);

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

	const openViewDialog = (wo) => {
		setViewTarget(wo);
		setViewOpen(true);
	};

	const closeViewDialog = () => {
		setViewOpen(false);
		setViewTarget(null);
	};

	const openEditDialog = (wo) => {
		if (!canUpdateWo) return;
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
			const updated = await updateWorkorder(editTargetId, payload);
			setWorkOrders((prev) =>
				prev.map((wo) => (Number(wo.id) === Number(updated.id) ? { ...wo, ...updated } : wo))
			);
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
		const wo = normalized.find((w) => Number(w.id) === woId);
		if (!wo) return;
		if (searchParams.get('edit') === '1' && canUpdateWo) {
			openEditDialog(wo);
		} else {
			openViewDialog(wo);
		}
		const next = new URLSearchParams(searchParams);
		next.delete('wo');
		next.delete('edit');
		setSearchParams(next, { replace: true });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoading, normalized, searchParams]);

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

	const tablePagination = useTablePagination(filtered, {
		pageSize: 10,
		sortById: false,
	});

	const exportCsv = () => {
		try {
			const header = [
				'id',
				'title',
				'aircraft',
				'assignee',
				'status',
				'priority',
				'due_by',
				'updated_at',
				'parts_count',
				'discrepancy_count',
			];
			const rows = filtered.map((wo) => [
				wo.id,
				wo.title || '',
				wo.aircraftLabel || '',
				wo.assigneeLabel || '',
				wo.status || '',
				wo.priority || '',
				wo.due_by || '',
				wo.updated_at || '',
				wo.partsCount,
				wo.discrepancyCount,
			]);
			downloadClientCsv(`work-orders-${activeStatus}.csv`, header, rows);
		} catch (e) {
			setError(e?.message || 'Export failed.');
		}
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
									<ScrollableTableContainer minWidth={1080}>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell sx={{ minWidth: 56 }}>ID</TableCell>
													<TableCell sx={{ minWidth: 160 }}>Parts</TableCell>
													<TableCell sx={{ minWidth: 120 }}>Aircraft</TableCell>
													<TableCell sx={{ minWidth: 120 }}>Assignee</TableCell>
													<TableCell sx={{ minWidth: 100 }}>Status</TableCell>
													<TableCell sx={{ minWidth: 100 }}>Due</TableCell>
													<TableCell sx={{ minWidth: 100 }}>Priority</TableCell>
													<TableCell sx={{ minWidth: 172 }}>Updated</TableCell>
													<TableCell sx={{ minWidth: 260, maxWidth: 400 }}>Description</TableCell>
													<TableCell sx={{ minWidth: 88 }}>Discrepancies</TableCell>
													<TableCell sx={{ minWidth: 200 }} align="right">Actions</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{tablePagination.pagedItems.map((wo) => (
													<TableRow
														key={wo.id}
														hover
														sx={{ cursor: 'pointer' }}
														onClick={() => openViewDialog(wo)}
													>
														<TableCell>{wo.id}</TableCell>
														<TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{wo.partsSummary || '—'}</TableCell>
														<TableCell>{wo.aircraftLabel}</TableCell>
														<TableCell>
															<Chip size="small" label={wo.assigneeLabel} />
														</TableCell>
														<TableCell><Chip size="small" label={statusLabel(wo.status)} /></TableCell>
														<TableCell>{wo.due_by || '—'}</TableCell>
														<TableCell>
															<Chip size="small" color={priorityColor(wo.priority)} label={statusLabel(wo.priority || 'medium')} />
														</TableCell>
														<TableCell sx={{ whiteSpace: 'nowrap' }}>
															{wo.updated_at ? new Date(wo.updated_at).toLocaleString() : '—'}
														</TableCell>
														<TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
															{wo.description || wo.title || '—'}
														</TableCell>
														<TableCell>{wo.discrepancyCount}</TableCell>
														<TableCell align="right" onClick={(e) => e.stopPropagation()}>
															<Stack direction="row" spacing={0.75} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
																<Button
																	size="small"
																	variant="outlined"
																	onClick={() => openViewDialog(wo)}
																>
																	View
																</Button>
																{canUpdateWo ? (
																	<Button
																		size="small"
																		variant="outlined"
																		onClick={() => openEditDialog(wo)}
																	>
																		Edit
																	</Button>
																) : null}
																{canAssignWorkOrders ? (
																	<Button
																		size="small"
																		variant="outlined"
																		onClick={() => openAssignDialog(wo)}
																	>
																		Assign
																	</Button>
																) : null}
																{canDeleteWo ? (
																	<Button
																		size="small"
																		color="error"
																		onClick={() => quickDelete(wo)}
																	>
																		Delete
																	</Button>
																) : null}
															</Stack>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</ScrollableTableContainer>
								)}
								{filtered.length > 0 ? (
									<TablePaginationBar
										page={tablePagination.page}
										pageCount={tablePagination.pageCount}
										pageSize={tablePagination.pageSize}
										total={tablePagination.total}
										onPageChange={tablePagination.setPage}
									/>
								) : null}
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				<Dialog open={viewOpen} onClose={closeViewDialog} fullWidth maxWidth="sm">
					<DialogTitle>
						Work order
						{viewTarget?.id != null ? ` #${viewTarget.id}` : ''}
					</DialogTitle>
					<DialogContent dividers>
						{viewTarget ? (
							<Stack spacing={2}>
								<Stack spacing={1.5}>
									<Typography variant="body2"><strong>Title:</strong> {viewTarget.title || '—'}</Typography>
									<Typography variant="body2"><strong>Aircraft:</strong> {viewTarget.aircraftLabel || '—'}</Typography>
									<Typography variant="body2"><strong>Assignee:</strong> {viewTarget.assigneeLabel || '—'}</Typography>
									<Typography variant="body2"><strong>Status:</strong> {statusLabel(viewTarget.status)}</Typography>
									<Typography variant="body2"><strong>Priority:</strong> {statusLabel(viewTarget.priority || 'medium')}</Typography>
									<Typography variant="body2"><strong>Due:</strong> {viewTarget.due_by || '—'}</Typography>
									<Typography variant="body2">
										<strong>Last updated:</strong>{' '}
										{viewTarget.updated_at ? new Date(viewTarget.updated_at).toLocaleString() : '—'}
									</Typography>
									<Typography variant="body2"><strong>Parts:</strong> {viewTarget.partsSummary || '—'}</Typography>
									<Typography variant="body2"><strong>Discrepancies:</strong> {viewTarget.discrepancyCount}</Typography>
									<Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
										<strong>Description:</strong> {viewTarget.description || '—'}
									</Typography>
								</Stack>
								<Divider />
								<Box>
									<Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
										Activity log
									</Typography>
									<WorkOrderActivityLog activities={viewTarget.activities} />
								</Box>
							</Stack>
						) : null}
					</DialogContent>
					<DialogActions>
						{canAccessMaintenance && viewTarget ? (
							<Button
								onClick={() => {
									closeViewDialog();
									navigate(`/maintenance?wo=${viewTarget.id}`);
								}}
							>
								Open in maintenance
							</Button>
						) : null}
						<Box sx={{ flexGrow: 1 }} />
						{canUpdateWo && viewTarget ? (
							<Button
								variant="outlined"
								onClick={() => {
									closeViewDialog();
									openEditDialog(viewTarget);
								}}
							>
								Edit
							</Button>
						) : null}
						<Button variant="contained" onClick={closeViewDialog}>Close</Button>
					</DialogActions>
				</Dialog>

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
											setEditForm((s) => ({
												...s,
												aircraft: nextAc,
												parts_needed: filterPartIdsForAircraft(
													s.parts_needed,
													parts,
													aircraft,
													nextAc
												),
											}));
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
															const p = fleetParts.find(
																(x) => Number(x.id) === Number(id)
															);
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
												? 'No parts catalogued for this aircraft'
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
							<Divider sx={{ my: 0.5 }} />
							<Box>
								<Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
									Activity log
								</Typography>
								<WorkOrderActivityLog activities={editTargetWo?.activities} />
							</Box>
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
