import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Container,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Grid,
	MenuItem,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography,
	CircularProgress,
	Divider,
} from '@mui/material';

import BuildIcon from '@mui/icons-material/Build';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import KPICard from '../components/KPICard';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import {
	createDiscrepancy,
	createWorkorder,
	deleteDiscrepancy,
	deleteWorkorder,
	fetchCompanyAircrafts,
	fetchCompanyDiscrepancies,
	fetchCompanyUsers,
	fetchCompanyWorkorders,
	fetchParts,
	updateDiscrepancy,
	updateWorkorder,
} from '../shared/Api';
import AircraftSelector from '../components/AircraftSelector';
import { useAppContext } from '../context/AppContext';
import { canSuperviseMaintenance, isMechanicRole, isPlatformAdmin } from '../shared/rbac';

/** Matches backend `WorkOrder.STATUS_CHOICES` — value stored, label shown in UI */
const WORK_ORDER_STATUS_OPTIONS = [
	{ value: 'open', label: 'Open' },
	{ value: 'in_progress', label: 'In Progress' },
	{ value: 'awaiting_parts', label: 'Awaiting Parts' },
	{ value: 'closed', label: 'Closed' },
];
const WORK_ORDER_PRIORITY_OPTIONS = [
	{ value: 'low', label: 'Low' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'high', label: 'High' },
	{ value: 'critical', label: 'Critical' },
];
const WORK_ORDER_ALLOWED_TRANSITIONS = {
	open: ['open', 'in_progress', 'awaiting_parts', 'closed'],
	in_progress: ['in_progress', 'awaiting_parts', 'closed'],
	awaiting_parts: ['awaiting_parts', 'in_progress', 'closed'],
	closed: ['closed'],
};

/** Matches backend `Discrepancy.STATUS_CHOICES` */
const DISCREPANCY_STATUS_OPTIONS = [
	{ value: 'pending', label: 'Pending' },
	{ value: 'closed', label: 'Closed' },
];

function labelForWorkOrderStatus(value) {
	if (value == null || value === '') return '—';
	return WORK_ORDER_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? String(value);
}

function labelForDiscrepancyStatus(value) {
	if (value == null || value === '') return '—';
	return DISCREPANCY_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? String(value);
}

function getAllowedWorkOrderStatusOptions(currentStatus) {
	const allowed =
		WORK_ORDER_ALLOWED_TRANSITIONS[currentStatus] || WORK_ORDER_ALLOWED_TRANSITIONS.open;
	return WORK_ORDER_STATUS_OPTIONS.filter((opt) => allowed.includes(opt.value));
}

function humanizeStatusToken(value) {
	if (!value) return value;
	return String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatActivitySummary(summary) {
	if (!summary) return summary;
	return String(summary).replace(
		/Status\s+([a-z_]+)\s+→\s+([a-z_]+)/gi,
		(_, fromStatus, toStatus) =>
			`Status ${humanizeStatusToken(fromStatus)} → ${humanizeStatusToken(toStatus)}`
	);
}

/** Profile / company user row: prefer real name, fall back to username (no role suffix). */
function profileDisplayName(u) {
	if (!u) return '';
	const fn = (u.first_name || '').trim();
	const ln = (u.last_name || '').trim();
	const full = `${fn} ${ln}`.trim();
	return full || (u.username || '').trim() || '';
}

function partAircraftId(p) {
	if (!p) return null;
	const a = p.aircraft;
	if (typeof a === 'object' && a != null) return a.id;
	return a;
}

/** Work order / discrepancy row: human-readable tail from nested or id-only `aircraft`. */
function formatEntityAircraft(entity) {
	if (!entity?.aircraft) return '—';
	const ac = entity.aircraft;
	if (typeof ac === 'object' && ac != null) {
		return `${ac.registration_number || ''} (${ac.model || ''})`.trim() || '—';
	}
	return String(ac);
}

function unwrapApiList(data) {
	if (Array.isArray(data)) return data;
	if (data && Array.isArray(data.results)) return data.results;
	return [];
}

function MaintenanceActivityList({ items, emptyHint }) {
	if (!items?.length) {
		return (
			<Typography variant="body2" color="text.secondary">{emptyHint}</Typography>
		);
	}
	return (
		<Stack spacing={1.25} sx={{ maxHeight: 260, overflow: 'auto', pr: 0.5 }}>
			{items.map((a) => (
				<Box key={a.id} sx={{ borderLeft: '3px solid', borderColor: 'divider', pl: 1.5, py: 0.25 }}>
					<Typography variant="caption" color="text.secondary" display="block">
						{a.created_at ? new Date(a.created_at).toLocaleString() : ''} · {a.actor_display || '—'}
						{a.event_type ? ` · ${a.event_type}` : ''}
					</Typography>
					<Typography variant="body2">{formatActivitySummary(a.summary)}</Typography>
				</Box>
			))}
		</Stack>
	);
}

// --- MAIN COMPONENT ---

const initialWorkorderForm = {
	title: '',
	aircraft: '',
	created_by: '',
	parts_needed: [],
	description: '',
	status: 'open',
	priority: 'medium',
	due_by: '',
};

const initialDiscrepancyForm = {
	aircraft: '',
	reporter: '',
	description: '',
	ata_code: '',
	tach_time: '',
	status: 'pending',
	work_order: '',
};

const Maintenance = () => {
	const { state } = useAppContext();
	const location = useLocation();
	const navigate = useNavigate();
	const platformAdmin = isPlatformAdmin(state.user);
	const mechanicRole = isMechanicRole(state.user);
	const superviseMaintenance = canSuperviseMaintenance(state.user);
	const canEditWorkOrderAssignment = superviseMaintenance || platformAdmin;
	const hasCompanyContext = Boolean(state.user?.companyId) || Boolean(localStorage.getItem('adminCompanyId'));
	const [isAddWorkOrderOpen, setIsAddWorkOrderOpen] = useState(false);
	const [isAddDiscrepancyOpen, setIsAddDiscrepancyOpen] = useState(false);
	const [workOrderDetailOpen, setWorkOrderDetailOpen] = useState(false);
	const [workOrderDetailEditing, setWorkOrderDetailEditing] = useState(false);
	const [discrepancyDetailOpen, setDiscrepancyDetailOpen] = useState(false);
	const [discrepancyDetailEditing, setDiscrepancyDetailEditing] = useState(false);
	const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
	const [selectedDiscrepancy, setSelectedDiscrepancy] = useState(null);
	const [workOrders, setWorkOrders] = useState([]);
	const [discrepancies, setDiscrepancies] = useState([]);
	const [aircraft, setAircraft] = useState([]);
	const [allParts, setAllParts] = useState([]);
	const [companyUsers, setCompanyUsers] = useState([]);
	const [workorderForm, setWorkorderForm] = useState(initialWorkorderForm);
	const [discrepancyForm, setDiscrepancyForm] = useState(initialDiscrepancyForm);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [expandedWorkOrderId, setExpandedWorkOrderId] = useState(null);
	const [expandedDiscrepancyId, setExpandedDiscrepancyId] = useState(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [deleteConfirmType, setDeleteConfirmType] = useState(null); // 'workorder' or 'discrepancy'
	const [deleteConfirmId, setDeleteConfirmId] = useState(null);
	const [didHandleDeepLink, setDidHandleDeepLink] = useState(false);
	const aircraftFilterFromQuery = new URLSearchParams(location.search).get('aircraft') || '';

	useEffect(() => {
		setDidHandleDeepLink(false);
	}, [location.search]);

	const resetWorkorderFormForCreate = () =>
		setWorkorderForm({
			...initialWorkorderForm,
			parts_needed: [],
		});

	const openAddWorkOrder = () => {
		resetWorkorderFormForCreate();
		setError('');
		setIsAddWorkOrderOpen(true);
	};

	const closeAddWorkOrder = () => {
		resetWorkorderFormForCreate();
		setIsAddWorkOrderOpen(false);
	};

	const resetDiscrepancyFormForCreate = () => setDiscrepancyForm({ ...initialDiscrepancyForm });

	const openAddDiscrepancy = () => {
		resetDiscrepancyFormForCreate();
		setError('');
		setIsAddDiscrepancyOpen(true);
	};

	const closeAddDiscrepancy = () => {
		resetDiscrepancyFormForCreate();
		setIsAddDiscrepancyOpen(false);
	};

	useEffect(() => {
		let mounted = true;

		const load = async () => {
			if (platformAdmin && !hasCompanyContext) {
				setIsLoading(false);
				return;
			}
			setIsLoading(true);
			setError('');
			try {
				const [woData, discData, aircraftData, userData, partsData] = await Promise.all([
					fetchCompanyWorkorders(),
					fetchCompanyDiscrepancies(),
					fetchCompanyAircrafts(),
					fetchCompanyUsers(),
					fetchParts(),
				]);
				if (!mounted) return;
				setWorkOrders(Array.isArray(woData) ? woData : []);
				setDiscrepancies(Array.isArray(discData) ? discData : []);
				setAircraft(Array.isArray(aircraftData) ? aircraftData : []);
				setCompanyUsers(Array.isArray(userData) ? userData : []);
				setAllParts(unwrapApiList(partsData));
			} catch (e) {
				if (!mounted) return;
				setError(e?.message || 'Failed to load maintenance data.');
			} finally {
				if (!mounted) return;
				setIsLoading(false);
			}
		};

		load();

		return () => {
			mounted = false;
		};
	}, [platformAdmin, hasCompanyContext]);

	const refreshMaintenanceData = async () => {
		const [woData, discData] = await Promise.all([
			fetchCompanyWorkorders(),
			fetchCompanyDiscrepancies(),
		]);
		setWorkOrders(Array.isArray(woData) ? woData : []);
		setDiscrepancies(Array.isArray(discData) ? discData : []);
	};

	const today = useMemo(() => new Date(), []);

	const overdueWorkOrders = useMemo(
		() =>
			workOrders.filter((wo) => {
				if (!wo.due_by) return false;
				const dueDate = new Date(wo.due_by);
				return dueDate < today;
			}),
		[workOrders, today]
	);

	const profileById = useMemo(() => {
		const m = new Map();
		companyUsers.forEach((u) => {
			if (u?.id != null) m.set(u.id, u);
		});
		return m;
	}, [companyUsers]);

	const resolveProfileName = (profileRef) => {
		if (profileRef == null) return '';
		if (typeof profileRef === 'object') return profileDisplayName(profileRef);
		const u = profileById.get(profileRef);
		return profileDisplayName(u) || String(profileRef);
	};

	const dueSoonWorkOrders = useMemo(
		() =>
			workOrders.filter((wo) => {
				if (!wo.due_by) return false;
				const dueDate = new Date(wo.due_by);
				const diffInTime = dueDate - today;
				const diffInDays = diffInTime / (1000 * 60 * 60 * 24);
				return diffInDays >= 0 && diffInDays <= 7;
			}),
		[workOrders, today]
	);

	const aircraftIdSet = useMemo(() => new Set(aircraft.map((a) => a.id)), [aircraft]);

	const companyParts = useMemo(
		() =>
			allParts.filter((p) => {
				const aid = partAircraftId(p);
				return aid != null && aircraftIdSet.has(aid);
			}),
		[allParts, aircraftIdSet]
	);

	const partLabelById = useMemo(() => {
		const m = new Map();
		companyParts.forEach((p) => m.set(p.id, `${p.part_number} — ${p.name}`));
		return m;
	}, [companyParts]);

	const mappedWorkOrders = useMemo(
		() =>
			workOrders.map((wo) => {
				const partIds = Array.isArray(wo.parts_needed) ? wo.parts_needed : [];
				const parts_summary = partIds.length
					? partIds
						.map((raw) => {
							const id = typeof raw === 'object' && raw != null ? raw.id : raw;
							return partLabelById.get(id) || `#${id}`;
						})
						.join(', ')
					: '';
				return {
					id: wo.id,
					order_number: wo.id,
					parts_summary,
					aircraft:
						typeof wo.aircraft === 'object' && wo.aircraft
							? `${wo.aircraft.registration_number || ''} ${wo.aircraft.model || ''}`.trim() ||
							wo.aircraft.model ||
							wo.aircraft.registration_number
							: wo.aircraft,
					assigned_to: resolveProfileName(wo.created_by),
					status: wo.status,
					status_label: labelForWorkOrderStatus(wo.status),
					due_date: wo.due_by,
					description: wo.description,
				};
			}),
		[workOrders, profileById, partLabelById]
	);

	const mappedDiscrepancies = useMemo(
		() =>
			discrepancies.map((d) => ({
				id: d.id,
				discrepancy_number: d.id,
				part_number: d.ata_code || '',
				aircraft:
					typeof d.aircraft === 'object' && d.aircraft
						? `${d.aircraft.registration_number || ''} ${d.aircraft.model || ''}`.trim() ||
						d.aircraft.model ||
						d.aircraft.registration_number
						: d.aircraft,
				status: d.status,
				status_label: labelForDiscrepancyStatus(d.status),
				description: d.description,
			})),
		[discrepancies]
	);

	const displayedWorkOrders = useMemo(() => {
		if (!aircraftFilterFromQuery) return mappedWorkOrders;
		return mappedWorkOrders.filter((wo) => {
			const source = workOrders.find((x) => x.id === wo.id);
			const aircraftId =
				typeof source?.aircraft === 'object' && source?.aircraft != null
					? source.aircraft.id
					: source?.aircraft;
			return String(aircraftId) === String(aircraftFilterFromQuery);
		});
	}, [aircraftFilterFromQuery, mappedWorkOrders, workOrders]);

	const displayedDiscrepancies = useMemo(() => {
		if (!aircraftFilterFromQuery) return mappedDiscrepancies;
		return mappedDiscrepancies.filter((d) => {
			const source = discrepancies.find((x) => x.id === d.id);
			const aircraftId =
				typeof source?.aircraft === 'object' && source?.aircraft != null
					? source.aircraft.id
					: source?.aircraft;
			return String(aircraftId) === String(aircraftFilterFromQuery);
		});
	}, [aircraftFilterFromQuery, mappedDiscrepancies, discrepancies]);

	const mechanicUsers = useMemo(
		() => companyUsers.filter((u) => ['mechanic', 'manager', 'owner'].includes(u?.company_role)),
		[companyUsers]
	);

	const partsForWorkorderAircraft = useMemo(() => {
		if (!workorderForm.aircraft) return [];
		const aid = Number(workorderForm.aircraft);
		return companyParts.filter((p) => Number(partAircraftId(p)) === aid);
	}, [companyParts, workorderForm.aircraft]);
	const allowedEditStatusOptions = useMemo(
		() => getAllowedWorkOrderStatusOptions(selectedWorkOrder?.status || 'open'),
		[selectedWorkOrder?.status]
	);

	const handleWorkorderAircraftChange = (newAc) => {
		setWorkorderForm((s) => {
			const aid = newAc === '' ? null : Number(newAc);
			const nextParts = (s.parts_needed || []).filter((pid) => {
				if (aid == null) return false;
				const p = companyParts.find((x) => x.id === Number(pid));
				return p && Number(partAircraftId(p)) === aid;
			});
			return { ...s, aircraft: newAc, parts_needed: nextParts };
		});
	};

	const handleCreateWorkorder = async () => {
		setError('');
		try {
			const payload = {
				title: workorderForm.title,
				aircraft: Number(workorderForm.aircraft),
				description: workorderForm.description,
				status: workorderForm.status,
				priority: workorderForm.priority,
				due_by: workorderForm.due_by || null,
				parts_needed: (workorderForm.parts_needed || []).map(Number),
			};
			if (workorderForm.created_by) {
				payload.created_by = Number(workorderForm.created_by);
			}
			await createWorkorder(payload);
			closeAddWorkOrder();
			await refreshMaintenanceData();
		} catch (e) {
			setError(e?.message || 'Failed to create work order.');
		}
	};

	const handleCreateDiscrepancy = async () => {
		setError('');
		try {
			await createDiscrepancy({
				...discrepancyForm,
				aircraft: Number(discrepancyForm.aircraft),
				reporter: discrepancyForm.reporter ? Number(discrepancyForm.reporter) : undefined,
				work_order: discrepancyForm.work_order ? Number(discrepancyForm.work_order) : null,
			});
			closeAddDiscrepancy();
			await refreshMaintenanceData();
		} catch (e) {
			setError(e?.message || 'Failed to create discrepancy.');
		}
	};

	const populateWorkorderFormFromWo = (wo) => {
		const aircraftId =
			typeof wo?.aircraft === 'object' && wo?.aircraft != null ? wo.aircraft.id : wo?.aircraft ?? '';
		const createdById =
			typeof wo?.created_by === 'object' && wo?.created_by != null ? wo.created_by.id : wo?.created_by ?? '';
		const rawPartIds = Array.isArray(wo?.parts_needed)
			? wo.parts_needed.map((x) => (typeof x === 'object' && x?.id != null ? x.id : x))
			: [];
		setWorkorderForm({
			title: wo?.title || '',
			aircraft: aircraftId === '' ? '' : aircraftId,
			created_by: createdById === '' ? '' : createdById,
			parts_needed: rawPartIds.map(Number),
			description: wo?.description || '',
			status: wo?.status || 'open',
			priority: wo?.priority || 'medium',
			due_by: wo?.due_by || '',
		});
	};

	const openWorkOrderDetail = (wo) => {
		setSelectedWorkOrder(wo);
		populateWorkorderFormFromWo(wo);
		setWorkOrderDetailEditing(false);
		setWorkOrderDetailOpen(true);
	};

	const closeWorkOrderDetail = () => {
		setWorkOrderDetailOpen(false);
		setWorkOrderDetailEditing(false);
		setSelectedWorkOrder(null);
	};

	const cancelWorkOrderEdit = () => {
		if (selectedWorkOrder) populateWorkorderFormFromWo(selectedWorkOrder);
		setWorkOrderDetailEditing(false);
	};

	const handleSaveMechanicWorkOrderProgress = async () => {
		if (!selectedWorkOrder?.id) return;
		setError('');
		try {
			await updateWorkorder(selectedWorkOrder.id, {
				status: workorderForm.status,
				priority: workorderForm.priority,
				due_by: workorderForm.due_by || null,
				description: workorderForm.description,
				parts_needed: (workorderForm.parts_needed || []).map(Number),
			});
			closeWorkOrderDetail();
			await refreshMaintenanceData();
		} catch (e) {
			setError(e?.message || 'Failed to update work order.');
		}
	};

	const handleSaveWorkorder = async () => {
		if (!selectedWorkOrder?.id) return;
		setError('');
		try {
			const payload = {
				title: workorderForm.title,
				aircraft: Number(workorderForm.aircraft),
				description: workorderForm.description,
				status: workorderForm.status,
				priority: workorderForm.priority,
				due_by: workorderForm.due_by || null,
				parts_needed: (workorderForm.parts_needed || []).map(Number),
			};
			if (workorderForm.created_by) {
				payload.created_by = Number(workorderForm.created_by);
			} else {
				payload.created_by = null;
			}
			await updateWorkorder(selectedWorkOrder.id, payload);
			closeWorkOrderDetail();
			await refreshMaintenanceData();
		} catch (e) {
			setError(e?.message || 'Failed to update work order.');
		}
	};

	const handleDeleteWorkorder = (id) => {
		setDeleteConfirmOpen(true);
		setDeleteConfirmType('workorder');
		setDeleteConfirmId(id);
    closeWorkOrderDetail();
	};

	const populateDiscrepancyFormFromRow = (d) => {
		const aircraftId =
			typeof d?.aircraft === 'object' && d?.aircraft != null ? d.aircraft.id : d?.aircraft ?? '';
		const reporterId =
			typeof d?.reporter === 'object' && d?.reporter != null ? d.reporter.id : d?.reporter ?? '';
		const woId =
			typeof d?.work_order === 'object' && d?.work_order != null ? d.work_order.id : d?.work_order ?? '';
		setDiscrepancyForm({
			aircraft: aircraftId === '' ? '' : String(aircraftId),
			reporter: reporterId === '' ? '' : String(reporterId),
			description: d?.description || '',
			ata_code: d?.ata_code || '',
			tach_time: d?.tach_time || '',
			status: d?.status || 'pending',
			work_order: woId === '' ? '' : String(woId),
		});
	};

	const openDiscrepancyDetail = (d) => {
		setSelectedDiscrepancy(d);
		populateDiscrepancyFormFromRow(d);
		setDiscrepancyDetailEditing(false);
		setDiscrepancyDetailOpen(true);
	};

	const closeDiscrepancyDetail = () => {
		setDiscrepancyDetailOpen(false);
		setDiscrepancyDetailEditing(false);
		setSelectedDiscrepancy(null);
	};

	const cancelDiscrepancyEdit = () => {
		if (selectedDiscrepancy) populateDiscrepancyFormFromRow(selectedDiscrepancy);
		setDiscrepancyDetailEditing(false);
	};

	const handleSaveMechanicDiscrepancy = async () => {
		if (!selectedDiscrepancy?.id) return;
		setError('');
		try {
			await updateDiscrepancy(selectedDiscrepancy.id, {
				status: discrepancyForm.status,
				description: discrepancyForm.description,
				ata_code: discrepancyForm.ata_code,
				tach_time: discrepancyForm.tach_time,
			});
			closeDiscrepancyDetail();
			await refreshMaintenanceData();
		} catch (e) {
			setError(e?.message || 'Failed to update discrepancy.');
		}
	};

	const handleSaveDiscrepancy = async () => {
		if (!selectedDiscrepancy?.id) return;
		setError('');
		try {
			await updateDiscrepancy(selectedDiscrepancy.id, {
				...discrepancyForm,
				aircraft: Number(discrepancyForm.aircraft),
				reporter: discrepancyForm.reporter ? Number(discrepancyForm.reporter) : undefined,
				work_order: discrepancyForm.work_order ? Number(discrepancyForm.work_order) : null,
			});
			closeDiscrepancyDetail();
			await refreshMaintenanceData();
		} catch (e) {
			setError(e?.message || 'Failed to update discrepancy.');
		}
	};

	const handleDeleteDiscrepancy = (id) => {
		setDeleteConfirmOpen(true);
		setDeleteConfirmType('discrepancy');
		setDeleteConfirmId(id);
    closeDiscrepancyDetail();
	};

	const confirmDelete = async () => {
		setError('');
		try {
			if (deleteConfirmType === 'workorder') {
				await deleteWorkorder(deleteConfirmId);
        // closeWorkOrderDetail();  // might be necessary?
			} else if (deleteConfirmType === 'discrepancy') {
				await deleteDiscrepancy(deleteConfirmId);
        // closeDiscrepancyDetail();  // might be necessary?
			}
			await refreshMaintenanceData();
			setDeleteConfirmOpen(false);
			setDeleteConfirmType(null);
			setDeleteConfirmId(null);
		} catch (e) {
			setError(e?.message || 'Failed to delete item.');
		}
	};

	const cancelDelete = () => {
		setDeleteConfirmOpen(false);
		setDeleteConfirmType(null);
		setDeleteConfirmId(null);
	};
  
	useEffect(() => {
		if (isLoading || didHandleDeepLink) return;
		const params = new URLSearchParams(location.search);
		const woParam = params.get('wo');
		const discParam = params.get('disc');
		const editParam = params.get('edit');

		if (woParam) {
			const woId = Number(woParam);
			const wo = workOrders.find((w) => Number(w?.id) === woId);
			if (wo) {
				openWorkOrderDetail(wo);
				if (editParam === '1') setWorkOrderDetailEditing(true);
			}
			setDidHandleDeepLink(true);
			navigate('/maintenance', { replace: true });
			return;
		}

		if (discParam) {
			const discId = Number(discParam);
			const d = discrepancies.find((x) => Number(x?.id) === discId);
			if (d) {
				openDiscrepancyDetail(d);
				if (editParam === '1') setDiscrepancyDetailEditing(true);
			}
			setDidHandleDeepLink(true);
			navigate('/maintenance', { replace: true });
			return;
		}

		setDidHandleDeepLink(true);
	}, [isLoading, didHandleDeepLink, location.search, workOrders, discrepancies, navigate]);
	
  return (
		<Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Box sx={{ mb: 3 }}>
					<Typography variant="h4" sx={{ fontWeight: 800 }}>
						Maintenance
					</Typography>
					<Typography variant="body2" color="text.secondary">
						{mechanicRole
							? 'Your assigned work orders and related discrepancies; file new discrepancy reports as needed.'
							: 'Work orders and discrepancy reports (company-scoped).'}
					</Typography>
				</Box>

				{error ? (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				) : null}
        {aircraftFilterFromQuery ? (
					<Alert severity="info" sx={{ mb: 2 }}>
						Filtered to aircraft ID {aircraftFilterFromQuery} from Fleet detail link.
					</Alert>
				) : null}

				{/* KPI Cards */}
				<Grid container spacing={3} sx={{ mb: 3, alignItems: 'center' }}>
					<Grid item xs={12} sm={6} md={3}>
						<KPICard
							icon={<WorkHistoryIcon />}
							label="Pending"
							value={discrepancies.length}
							loading={isLoading}
							iconBgColor="#2196F315"
							iconColor="#2196F3"
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<KPICard
							icon={<BuildIcon />}
							label="Open"
							value={workOrders.length}
							loading={isLoading}
							iconBgColor="#FF980015"
							iconColor="#FF9800"
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<KPICard
							icon={<WarningIcon />}
							label="Overdue"
							value={overdueWorkOrders.length}
							loading={isLoading}
							iconBgColor="#F4433615"
							iconColor="#F44336"
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<KPICard
							icon={<CheckCircleIcon />}
							label="Due Soon"
							value={dueSoonWorkOrders.length}
							loading={isLoading}
							iconBgColor="#4CAF5015"
							iconColor="#4CAF50"
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 1 }}>
						{superviseMaintenance ? (
							<Button
								variant="contained"
								startIcon={<BuildIcon />}
								onClick={openAddWorkOrder}
								fullWidth
							>
								Add Work Order
							</Button>
						) : null}
						<Button
							variant="outlined"
							startIcon={<WarningIcon />}
							onClick={openAddDiscrepancy}
							fullWidth
						>
							Add Discrepancy
						</Button>
					</Grid>
				</Grid>

				{/* Tables */}
				<Grid container spacing={3} sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
					<Grid item sx={{ width: '100%', flex: '0 0 auto' }}>
						<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', width: '100%' }}>
							<CardContent sx={{ p: 3 }}>
								<Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
									Work Orders
								</Typography>

								{isLoading ? (
									<Stack alignItems="center" sx={{ py: 4 }}>
										<CircularProgress />
									</Stack>
								) : (
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell></TableCell>
												<TableCell>ID</TableCell>
												<TableCell>Parts</TableCell>
												<TableCell>Aircraft</TableCell>
												<TableCell>Assigned</TableCell>
												<TableCell>Status</TableCell>
												<TableCell>Due</TableCell>
												<TableCell>Actions</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{displayedWorkOrders.map((order) => ( // merge note: changed mappedWorkOrders to displayedWorkOrders
												<React.Fragment key={order.id}>
													<TableRow>
														<TableCell sx={{ width: 40, padding: '8px 4px' }}>
														</TableCell>
														<TableCell>{order.order_number}</TableCell>
														<TableCell sx={{ maxWidth: 220, whiteSpace: 'normal', wordBreak: 'break-word' }}>
															{order.parts_summary || '—'}
														</TableCell>
														<TableCell>{order.aircraft || '—'}</TableCell>
														<TableCell>{order.assigned_to || '—'}</TableCell>
														<TableCell>{order.status_label}</TableCell>
														<TableCell>{order.due_date || '—'}</TableCell>
														<TableCell>
															{superviseMaintenance ? (
																<>
																	<Button size="small" sx={{ background: '#FF4C05', borderRadius: '10px', color: 'white', margin: '1em' }} onClick={() => openWorkOrderDetail(workOrders.find((w) => w.id === order.id))}>
																		Edit
																	</Button>
																	<Button size="small" sx={{ background: '#D92B2B', color: 'white', borderRadius: '10px', margin: '1em' }} onClick={() => handleDeleteWorkorder(order.id)}>
																		Delete
																	</Button>
																</>
															) : (
																<Button size="small" variant="outlined" onClick={() => openWorkOrderDetail(workOrders.find((w) => w.id === order.id))}>
																	View / log progress
																</Button>
															)}
														</TableCell>
														<Button
															size="large"
															onClick={() => setExpandedWorkOrderId(expandedWorkOrderId === order.id ? null : order.id)}
															sx={{ minWidth: 0, padding: '4px' }}
														>
															{expandedWorkOrderId === order.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
														</Button>
													</TableRow>
													{expandedWorkOrderId === order.id && (
														<TableRow sx={{ bgcolor: 'action.hover' }}>
															<TableCell colSpan={8} sx={{ p: 2 }}>
																<Stack spacing={1}>
																	<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Description</Typography>
																	<Typography variant="body2">{order.description || '—'}</Typography>
																</Stack>
															</TableCell>
														</TableRow>
													)}
												</React.Fragment>
											))}
											{displayedWorkOrders.length === 0 ? (
												<TableRow>
													<TableCell colSpan={8} sx={{ color: 'text.secondary' }}>
														No work orders found.
													</TableCell>
												</TableRow>
											) : null}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</Grid>

					<Grid item sx={{ width: '100%', flex: '0 0 auto' }}>
						<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', width: '100%' }}>
							<CardContent sx={{ p: 3 }}>
								<Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
									Discrepancies
								</Typography>

								{isLoading ? (
									<Stack alignItems="center" sx={{ py: 4 }}>
										<CircularProgress />
									</Stack>
								) : (
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell></TableCell>
												<TableCell>ID</TableCell>
												<TableCell>ATA</TableCell>
												<TableCell>Aircraft</TableCell>
												<TableCell>Status</TableCell>
												<TableCell>Actions</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{displayedDiscrepancies.map((d) => ( // merge note: changed mappedDiscrepancies to displayedDiscrepancies
												<React.Fragment key={d.id}>
													<TableRow>
														<TableCell sx={{ width: 40, padding: '8px 4px' }}>
														</TableCell>
														<TableCell>{d.discrepancy_number}</TableCell>
														<TableCell>{d.part_number || '—'}</TableCell>
														<TableCell>{d.aircraft || '—'}</TableCell>
														<TableCell>{d.status_label}</TableCell>
														<TableCell>
															{superviseMaintenance ? (
																<>
																	<Button size="small" onClick={() => openDiscrepancyDetail(discrepancies.find((x) => x.id === d.id))}>
																		Edit
																	</Button>
																	<Button size="small" sx={{ background: '#D92B2B', color: 'white', borderRadius: '10px' }} onClick={() => handleDeleteDiscrepancy(d.id)}>
																		Delete
																	</Button>
																</>
															) : (
																<Button size="small" variant="outlined" onClick={() => openDiscrepancyDetail(discrepancies.find((x) => x.id === d.id))}>
																	View / update
																</Button>
															)}
														</TableCell>
														<Button
															size="large"
															onClick={() => setExpandedDiscrepancyId(expandedDiscrepancyId === d.id ? null : d.id)}
															sx={{ minWidth: 0, padding: '4px' }}
														>
															{expandedDiscrepancyId === d.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
														</Button>
													</TableRow>
													{expandedDiscrepancyId === d.id && (
														<TableRow sx={{ bgcolor: 'action.hover' }}>
															<TableCell colSpan={6} sx={{ p: 2 }}>
																<Stack spacing={1}>
																	<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Description</Typography>
																	<Typography variant="body2">{d.description || '—'}</Typography>
																</Stack>
															</TableCell>
														</TableRow>
													)}
												</React.Fragment>
											))}
											{displayedDiscrepancies.length === 0 ? (
												<TableRow>
													<TableCell colSpan={6} sx={{ color: 'text.secondary' }}>
														No discrepancies found.
													</TableCell>
												</TableRow>
											) : null}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Modals */}
				<Dialog open={isAddWorkOrderOpen} onClose={() => setIsAddWorkOrderOpen(false)} maxWidth="sm" fullWidth>
					<DialogTitle>Create Work Order</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<TextField label="Title" value={workorderForm.title} onChange={(e) => setWorkorderForm((s) => ({ ...s, title: e.target.value }))} />
							<AircraftSelector
								label="Aircraft"
								value={workorderForm.aircraft}
								onChange={handleWorkorderAircraftChange}
								options={aircraft}
								required
							/>
							<TextField
								select
								label="Parts needed"
								SelectProps={{
									multiple: true,
									renderValue: (selected) =>
										(selected || []).length
											? (selected || []).map((id) => partLabelById.get(id) || `#${id}`).join(', ')
											: '—',
								}}
								value={workorderForm.parts_needed || []}
								onChange={(e) =>
									setWorkorderForm((s) => ({
										...s,
										parts_needed:
											typeof e.target.value === 'string'
												? e.target.value.split(',').map(Number)
												: e.target.value,
									}))
								}
								helperText={
									!workorderForm.aircraft
										? 'Select an aircraft to see parts for that aircraft'
										: partsForWorkorderAircraft.length === 0
											? 'No parts are catalogued for this aircraft yet'
											: 'Optional — inventory parts linked to this tail number'
								}
								disabled={!workorderForm.aircraft}
							>
								{partsForWorkorderAircraft.map((p) => (
									<MenuItem key={p.id} value={p.id}>{p.part_number} — {p.name}</MenuItem>
								))}
							</TextField>
							<TextField select label="Assigned To" value={workorderForm.created_by || ''} onChange={(e) => setWorkorderForm((s) => ({ ...s, created_by: e.target.value }))}>
								<MenuItem value="">Current user</MenuItem>
								{mechanicUsers.map((u) => (
									<MenuItem key={u.id} value={u.id}>{profileDisplayName(u)}</MenuItem>
								))}
							</TextField>
							<TextField select label="Status" value={workorderForm.status} onChange={(e) => setWorkorderForm((s) => ({ ...s, status: e.target.value }))}>
								{WORK_ORDER_STATUS_OPTIONS.map((opt) => (
									<MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
								))}
							</TextField>
							<TextField select label="Priority" value={workorderForm.priority} onChange={(e) => setWorkorderForm((s) => ({ ...s, priority: e.target.value }))}>
								{WORK_ORDER_PRIORITY_OPTIONS.map((opt) => (
									<MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
								))}
							</TextField>
							<TextField type="date" label="Due Date" InputLabelProps={{ shrink: true }} value={workorderForm.due_by} onChange={(e) => setWorkorderForm((s) => ({ ...s, due_by: e.target.value }))} />
							<TextField label="Description" multiline minRows={3} value={workorderForm.description} onChange={(e) => setWorkorderForm((s) => ({ ...s, description: e.target.value }))} />
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={closeAddWorkOrder}>Cancel</Button>
						<Button variant="contained" onClick={handleCreateWorkorder}>Create</Button>
					</DialogActions>
				</Dialog>

				<Dialog open={workOrderDetailOpen} onClose={closeWorkOrderDetail} maxWidth="sm" fullWidth>
					<DialogTitle>
						{workOrderDetailEditing
							? superviseMaintenance
								? 'Edit work order'
								: 'Update progress'
							: 'Work order'}
					</DialogTitle>
					<DialogContent>
						{selectedWorkOrder ? (
							<Stack spacing={2} sx={{ mt: 1 }}>
								{!workOrderDetailEditing ? (
									<>
										<Stack spacing={0.75}>
											<Typography variant="caption" color="text.secondary">Title</Typography>
											<Typography variant="body1">{selectedWorkOrder.title || '—'}</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Aircraft</Typography>
											<Typography variant="body1">{formatEntityAircraft(selectedWorkOrder)}</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Assigned to</Typography>
											<Typography variant="body1">{resolveProfileName(selectedWorkOrder.created_by) || '—'}</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Parts on order</Typography>
											<Typography variant="body1">
												{Array.isArray(selectedWorkOrder.parts_needed) && selectedWorkOrder.parts_needed.length
													? selectedWorkOrder.parts_needed
															.map((raw) => {
																const id = typeof raw === 'object' && raw != null ? raw.id : raw;
																return partLabelById.get(id) || `#${id}`;
															})
															.join(', ')
													: '—'}
											</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Status</Typography>
											<Typography variant="body1">{labelForWorkOrderStatus(selectedWorkOrder.status)}</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Priority</Typography>
											<Typography variant="body1">
												{WORK_ORDER_PRIORITY_OPTIONS.find((p) => p.value === selectedWorkOrder.priority)?.label || 'Medium'}
											</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Due</Typography>
											<Typography variant="body1">{selectedWorkOrder.due_by || '—'}</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Description</Typography>
											<Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{selectedWorkOrder.description || '—'}</Typography>
										</Stack>
										<Divider />
										<Typography variant="subtitle2">Activity log</Typography>
										<MaintenanceActivityList
											items={selectedWorkOrder?.activities}
											emptyHint="No history yet."
										/>
									</>
								) : superviseMaintenance ? (
									<>
										<TextField
											label="Title"
											value={workorderForm.title}
											onChange={(e) => setWorkorderForm((s) => ({ ...s, title: e.target.value }))}
											disabled={!canEditWorkOrderAssignment}
											helperText={!canEditWorkOrderAssignment ? 'Supervisors create and name work orders' : undefined}
										/>
										<TextField
											select
											label="Aircraft"
											value={workorderForm.aircraft}
											disabled={!canEditWorkOrderAssignment}
											onChange={(e) => {
												const newAc = e.target.value;
												setWorkorderForm((s) => {
													const aid = newAc === '' ? null : Number(newAc);
													const nextParts = (s.parts_needed || []).filter((pid) => {
														if (aid == null) return false;
														const p = companyParts.find((x) => x.id === Number(pid));
														return p && Number(partAircraftId(p)) === aid;
													});
													return { ...s, aircraft: newAc, parts_needed: nextParts };
												});
											}}
										>
											{aircraft.map((a) => (
												<MenuItem key={a.id} value={a.id}>{a.registration_number} ({a.model})</MenuItem>
											))}
										</TextField>
										<TextField
											select
											label="Parts needed"
											SelectProps={{
												multiple: true,
												renderValue: (selected) =>
													(selected || []).length
														? (selected || []).map((id) => partLabelById.get(id) || `#${id}`).join(', ')
														: '—',
											}}
											value={workorderForm.parts_needed || []}
											onChange={(e) =>
												setWorkorderForm((s) => ({
													...s,
													parts_needed:
														typeof e.target.value === 'string'
															? e.target.value.split(',').map(Number)
															: e.target.value,
												}))
											}
											helperText={
												!workorderForm.aircraft
													? 'Select an aircraft first'
													: partsForWorkorderAircraft.length === 0
														? 'No parts catalogued for this aircraft'
														: 'Update parts tied to this work order'
											}
											disabled={!workorderForm.aircraft}
										>
											{partsForWorkorderAircraft.map((p) => (
												<MenuItem key={p.id} value={p.id}>{p.part_number} — {p.name}</MenuItem>
											))}
										</TextField>
										<TextField
											select
											label="Assigned To"
											value={workorderForm.created_by || ''}
											disabled={!canEditWorkOrderAssignment}
											onChange={(e) => setWorkorderForm((s) => ({ ...s, created_by: e.target.value }))}
										>
											<MenuItem value="">Unassigned</MenuItem>
											{mechanicUsers.map((u) => (
												<MenuItem key={u.id} value={u.id}>{profileDisplayName(u)}</MenuItem>
											))}
										</TextField>
										<TextField select label="Status" value={workorderForm.status} onChange={(e) => setWorkorderForm((s) => ({ ...s, status: e.target.value }))}>
											{allowedEditStatusOptions.map((opt) => (
												<MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
											))}
										</TextField>
										<TextField select label="Priority" value={workorderForm.priority} onChange={(e) => setWorkorderForm((s) => ({ ...s, priority: e.target.value }))}>
											{WORK_ORDER_PRIORITY_OPTIONS.map((opt) => (
												<MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
											))}
										</TextField>
										<TextField type="date" label="Due Date" InputLabelProps={{ shrink: true }} value={workorderForm.due_by} onChange={(e) => setWorkorderForm((s) => ({ ...s, due_by: e.target.value }))} />
										<TextField label="Description" multiline minRows={3} value={workorderForm.description} onChange={(e) => setWorkorderForm((s) => ({ ...s, description: e.target.value }))} />
										<Divider />
										<Typography variant="subtitle2">Activity log</Typography>
										<MaintenanceActivityList
											items={selectedWorkOrder?.activities}
											emptyHint="No history yet."
										/>
									</>
								) : (
									<>
										<Typography variant="body2" color="text.secondary">
											Update status, due date, notes, and parts for this assignment.
										</Typography>
										<TextField select label="Status" value={workorderForm.status} onChange={(e) => setWorkorderForm((s) => ({ ...s, status: e.target.value }))} fullWidth>
											{allowedEditStatusOptions.map((opt) => (
												<MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
											))}
										</TextField>
										<TextField select label="Priority" value={workorderForm.priority} onChange={(e) => setWorkorderForm((s) => ({ ...s, priority: e.target.value }))} fullWidth>
											{WORK_ORDER_PRIORITY_OPTIONS.map((opt) => (
												<MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
											))}
										</TextField>
										<TextField type="date" label="Due date" InputLabelProps={{ shrink: true }} value={workorderForm.due_by} onChange={(e) => setWorkorderForm((s) => ({ ...s, due_by: e.target.value }))} fullWidth />
										<TextField label="Description / notes" multiline minRows={3} value={workorderForm.description} onChange={(e) => setWorkorderForm((s) => ({ ...s, description: e.target.value }))} fullWidth />
										<TextField
											select
											label="Parts needed"
											fullWidth
											SelectProps={{
												multiple: true,
												renderValue: (selected) =>
													(selected || []).length
														? (selected || []).map((id) => partLabelById.get(id) || `#${id}`).join(', ')
														: '—',
											}}
											value={workorderForm.parts_needed || []}
											onChange={(e) =>
												setWorkorderForm((s) => ({
													...s,
													parts_needed:
														typeof e.target.value === 'string'
															? e.target.value.split(',').map(Number)
															: e.target.value,
												}))
											}
											disabled={!workorderForm.aircraft}
										>
											{partsForWorkorderAircraft.map((p) => (
												<MenuItem key={p.id} value={p.id}>{p.part_number} — {p.name}</MenuItem>
											))}
										</TextField>
										<Divider />
										<Typography variant="subtitle2">Activity log</Typography>
										<MaintenanceActivityList
											items={selectedWorkOrder?.activities}
											emptyHint="No history yet."
										/>
									</>
								)}
							</Stack>
						) : null}
					</DialogContent>
					<DialogActions>
						{!workOrderDetailEditing ? (
							<>
								<Button onClick={closeWorkOrderDetail}>Close</Button>
								{superviseMaintenance ? (
									<Button color="error" onClick={() => handleDeleteWorkorder(selectedWorkOrder.id)}>
										Delete
									</Button>
								) : null}
								<Button variant="contained" onClick={() => setWorkOrderDetailEditing(true)}>
									Edit
								</Button>
							</>
						) : (
							<>
								<Button onClick={cancelWorkOrderEdit}>Cancel</Button>
								<Button
									variant="contained"
									onClick={superviseMaintenance ? handleSaveWorkorder : handleSaveMechanicWorkOrderProgress}
								>
									Save
								</Button>
							</>
						)}
					</DialogActions>
				</Dialog>

				<Dialog open={isAddDiscrepancyOpen} onClose={closeAddDiscrepancy} maxWidth="sm" fullWidth>
					<DialogTitle>Create Discrepancy</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<AircraftSelector
								label="Aircraft"
								value={discrepancyForm.aircraft}
								onChange={(next) => setDiscrepancyForm((s) => ({ ...s, aircraft: next }))}
								options={aircraft}
								required
							/>
							<TextField select label="Reporter" value={discrepancyForm.reporter} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, reporter: e.target.value }))}>
								<MenuItem value="">Current user</MenuItem>
								{companyUsers.map((u) => (
									<MenuItem key={u.id} value={u.id}>{profileDisplayName(u)}</MenuItem>
								))}
							</TextField>
							<TextField select label="Work Order (optional)" value={discrepancyForm.work_order} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, work_order: e.target.value }))}>
								<MenuItem value="">None</MenuItem>
								{workOrders.map((wo) => (
									<MenuItem key={wo.id} value={wo.id}>#{wo.id} - {wo.title}</MenuItem>
								))}
							</TextField>
							<TextField label="ATA Code" value={discrepancyForm.ata_code} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, ata_code: e.target.value }))} />
							<TextField label="Tach Time" value={discrepancyForm.tach_time} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, tach_time: e.target.value }))} />
							<TextField select label="Status" value={discrepancyForm.status} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, status: e.target.value }))}>
								{DISCREPANCY_STATUS_OPTIONS.map((opt) => (
									<MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
								))}
							</TextField>
							<TextField label="Description" multiline minRows={3} value={discrepancyForm.description} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, description: e.target.value }))} />
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={closeAddDiscrepancy}>Cancel</Button>
						<Button variant="contained" onClick={handleCreateDiscrepancy}>Create</Button>
					</DialogActions>
				</Dialog>

				<Dialog open={discrepancyDetailOpen} onClose={closeDiscrepancyDetail} maxWidth="sm" fullWidth>
					<DialogTitle>
						{discrepancyDetailEditing
							? superviseMaintenance
								? 'Edit discrepancy'
								: 'Update discrepancy'
							: 'Discrepancy'}
					</DialogTitle>
					<DialogContent>
						{selectedDiscrepancy ? (
							<Stack spacing={2} sx={{ mt: 1 }}>
								{!discrepancyDetailEditing ? (
									<>
										<Stack spacing={0.75}>
											<Typography variant="caption" color="text.secondary">Aircraft</Typography>
											<Typography variant="body1">{formatEntityAircraft(selectedDiscrepancy)}</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Reporter</Typography>
											<Typography variant="body1">
												{selectedDiscrepancy.reporter_name || resolveProfileName(selectedDiscrepancy.reporter) || '—'}
											</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Linked work order</Typography>
											<Typography variant="body1">
												{(() => {
													const woRef = selectedDiscrepancy.work_order;
													if (typeof woRef === 'object' && woRef != null) {
														return `#${woRef.id} — ${woRef.title || ''}`.trim();
													}
													return woRef != null && woRef !== '' ? `#${woRef}` : '—';
												})()}
											</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Date reported</Typography>
											<Typography variant="body1">{selectedDiscrepancy.date_reported || '—'}</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Status</Typography>
											<Typography variant="body1">{labelForDiscrepancyStatus(selectedDiscrepancy.status)}</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>ATA</Typography>
											<Typography variant="body1">{selectedDiscrepancy.ata_code || '—'}</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Tach time</Typography>
											<Typography variant="body1">{selectedDiscrepancy.tach_time || '—'}</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Description</Typography>
											<Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{selectedDiscrepancy.description || '—'}</Typography>
										</Stack>
										<Divider />
										<Typography variant="subtitle2">Activity log</Typography>
										<MaintenanceActivityList
											items={selectedDiscrepancy?.activities}
											emptyHint="No history yet."
										/>
									</>
								) : superviseMaintenance ? (
									<>
										<TextField select label="Status" value={discrepancyForm.status} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, status: e.target.value }))}>
											{DISCREPANCY_STATUS_OPTIONS.map((opt) => (
												<MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
											))}
										</TextField>
										<TextField label="ATA Code" value={discrepancyForm.ata_code} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, ata_code: e.target.value }))} />
										<TextField label="Tach Time" value={discrepancyForm.tach_time} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, tach_time: e.target.value }))} />
										<TextField label="Description" multiline minRows={3} value={discrepancyForm.description} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, description: e.target.value }))} />
										<Divider />
										<Typography variant="subtitle2">Activity log</Typography>
										<MaintenanceActivityList
											items={selectedDiscrepancy?.activities}
											emptyHint="No history yet."
										/>
									</>
								) : (
									<>
										<TextField select label="Status" value={discrepancyForm.status} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, status: e.target.value }))} fullWidth>
											{DISCREPANCY_STATUS_OPTIONS.map((opt) => (
												<MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
											))}
										</TextField>
										<TextField label="ATA code" value={discrepancyForm.ata_code} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, ata_code: e.target.value }))} fullWidth />
										<TextField label="Tach time" value={discrepancyForm.tach_time} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, tach_time: e.target.value }))} fullWidth />
										<TextField label="Description / corrective action" multiline minRows={3} value={discrepancyForm.description} onChange={(e) => setDiscrepancyForm((s) => ({ ...s, description: e.target.value }))} fullWidth />
										<Divider />
										<Typography variant="subtitle2">Activity log</Typography>
										<MaintenanceActivityList
											items={selectedDiscrepancy?.activities}
											emptyHint="No history yet."
										/>
									</>
								)}
							</Stack>
						) : null}
					</DialogContent>
					<DialogActions>
						{!discrepancyDetailEditing ? (
							<>
								<Button onClick={closeDiscrepancyDetail}>Close</Button>
								{superviseMaintenance ? (
									<Button color="error" onClick={() => handleDeleteDiscrepancy(selectedDiscrepancy.id)}>
										Delete
									</Button>
								) : null}
								<Button variant="contained" onClick={() => setDiscrepancyDetailEditing(true)}>
									Edit
								</Button>
							</>
						) : (
							<>
								<Button onClick={cancelDiscrepancyEdit}>Cancel</Button>
								<Button
									variant="contained"
									onClick={superviseMaintenance ? handleSaveDiscrepancy : handleSaveMechanicDiscrepancy}
								>
									Save
								</Button>
							</>
						)}
					</DialogActions>
				</Dialog>

				<DeleteConfirmationDialog
					open={deleteConfirmOpen}
					itemType={deleteConfirmType === 'workorder' ? 'work order' : 'discrepancy'}
					onConfirm={confirmDelete}
					onCancel={cancelDelete}
					isLoading={isLoading}
				/>
			</Container>
		</Box>
	);
}
export default Maintenance;