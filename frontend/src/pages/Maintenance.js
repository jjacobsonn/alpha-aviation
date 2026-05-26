import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
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

import KPICard from '../components/KPICard';
import LaborEntriesPanel from '../components/maintenance/LaborEntriesPanel';
import {
	MaintenanceActivityTimeline,
	MaintenanceDescriptionBlock,
	MaintenanceLinkButton,
	MaintenanceMetaGrid,
	MaintenanceOpenRecordButton,
	MaintenancePanelSection,
	MaintenancePeopleStrip,
	MaintenanceRecordHeader,
	MaintenanceStatusChip,
	discrepancySummaryLine,
	parseAircraftFromEntity,
} from '../components/maintenance/MaintenanceDetailPanel';
import {
	profileDisplayName,
	resolvePersonDisplay,
	workOrderPeopleLabels,
} from '../shared/profileDisplay';
import {
	discrepancyLinkLabel,
	workOrderHeadline,
	workOrderRefId,
} from '../shared/workOrderDisplay';
import useDebouncedValue from '../shared/useDebouncedValue';
import {
	DISCREPANCY_TABLE_FILTERS,
	WORK_ORDER_TABLE_FILTERS,
	buildDiscrepancySuggestions,
	buildWorkOrderSuggestions,
	filterMaintenanceDiscrepancies,
	filterMaintenanceWorkOrders,
	maintenanceTableEmptyHint,
} from '../shared/moduleSearch';
import ModuleSearchBar from '../components/search/ModuleSearchBar';
import ScrollableTableContainer from '../components/ScrollableTableContainer';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import {
	closeWorkOrder,
	createDiscrepancy,
	createWorkorder,
	deleteDiscrepancy,
	deleteWorkorder,
	fetchCompanyAircrafts,
	fetchCompanyDiscrepancies,
	fetchCompanyUsers,
	fetchCompanyWorkorders,
	fetchMaintenanceDashboard,
	fetchParts,
	openWorkOrderFromDiscrepancy,
	updateDiscrepancy,
	updateWorkorder,
} from '../shared/Api';
import AircraftSelector from '../components/AircraftSelector';
import { useAppContext } from '../context/AppContext';
import {
	canDeleteWorkOrders,
	canSuperviseMaintenance,
	isMechanicRole,
	isPlatformAdmin,
} from '../shared/rbac';

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
const ALL_WORK_ORDER_STATUSES = ['open', 'in_progress', 'awaiting_parts', 'closed'];

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

function getAllowedWorkOrderStatusOptions() {
	return WORK_ORDER_STATUS_OPTIONS.filter((opt) => ALL_WORK_ORDER_STATUSES.includes(opt.value));
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
	return (
		<MaintenancePanelSection title="Activity log">
			<MaintenanceActivityTimeline
				items={items}
				emptyHint={emptyHint}
				formatSummary={formatActivitySummary}
			/>
		</MaintenancePanelSection>
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

const detailDialogActionsSx = {
	flexWrap: 'wrap',
	gap: 1,
	px: { xs: 2, sm: 3 },
	py: { xs: 1.5, sm: 2 },
};

const Maintenance = () => {
	const { state } = useAppContext();
	const location = useLocation();
	const navigate = useNavigate();
	const platformAdmin = isPlatformAdmin(state.user);
	const mechanicRole = isMechanicRole(state.user);
	const superviseMaintenance = canSuperviseMaintenance(state);
	const canDeleteMaintenanceRecords = canDeleteWorkOrders(state);
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
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [deleteConfirmType, setDeleteConfirmType] = useState(null); // 'workorder' or 'discrepancy'
	const [deleteConfirmId, setDeleteConfirmId] = useState(null);
	const [didHandleDeepLink, setDidHandleDeepLink] = useState(false);
	const [woSearch, setWoSearch] = useState('');
	const [woStatusFilters, setWoStatusFilters] = useState([]);
	const [discSearch, setDiscSearch] = useState('');
	const [discStatusFilters, setDiscStatusFilters] = useState([]);
	const debouncedWoSearch = useDebouncedValue(woSearch, 300);
	const debouncedDiscSearch = useDebouncedValue(discSearch, 300);
	const [dashboardKPIs, setDashboardKPIs] = useState(null);
	const [closeWoDialogOpen, setCloseWoDialogOpen] = useState(false);
	const [closeWoNotes, setCloseWoNotes] = useState('');
	const [closeWoLaborHours, setCloseWoLaborHours] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
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
				const [woRes, discRes, aircraftRes, userRes, partsRes] = await Promise.allSettled([
					fetchCompanyWorkorders(),
					fetchCompanyDiscrepancies(),
					fetchCompanyAircrafts(),
					fetchCompanyUsers(),
					fetchParts(),
				]);
				if (!mounted) return;
				const woData = woRes.status === 'fulfilled' ? woRes.value : [];
				const discData = discRes.status === 'fulfilled' ? discRes.value : [];
				const aircraftData = aircraftRes.status === 'fulfilled' ? aircraftRes.value : [];
				const userData = userRes.status === 'fulfilled' ? userRes.value : [];
				const partsData = partsRes.status === 'fulfilled' ? partsRes.value : [];
				setWorkOrders(unwrapApiList(woData));
				setDiscrepancies(unwrapApiList(discData));
				setAircraft(unwrapApiList(aircraftData));
				setCompanyUsers(unwrapApiList(userData));
				setAllParts(unwrapApiList(partsData));
				if (woRes.status === 'rejected') {
					setError(woRes.reason?.message || 'Failed to load work orders.');
				}

				fetchMaintenanceDashboard()
					.then((kpis) => mounted && setDashboardKPIs(kpis))
					.catch(() => {});
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
		fetchMaintenanceDashboard()
			.then((kpis) => setDashboardKPIs(kpis))
			.catch(() => {});
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

	const resolveProfileName = (profileRef, displayName) =>
		resolvePersonDisplay(profileRef, displayName, profileById);

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

	const aircraftLabelById = useMemo(() => {
		const m = new Map();
		aircraft.forEach((a) => {
			const label = `${a.registration_number || ''} (${a.model || ''})`.trim();
			m.set(Number(a.id), label || a.registration_number || a.model || `Aircraft #${a.id}`);
		});
		return m;
	}, [aircraft]);

	const mappedWorkOrders = useMemo(
		() =>
			workOrders.map((wo) => {
				const partIds = Array.isArray(wo.parts_needed) ? wo.parts_needed : [];
				const part_labels = partIds.length
					? partIds.map((raw) => {
							const id = typeof raw === 'object' && raw != null ? raw.id : raw;
							return partLabelById.get(id) || `#${id}`;
					  })
					: [];
				return {
					id: wo.id,
					work_order_label: wo.title?.trim() || `Work order #${wo.id}`,
					part_labels,
					aircraft:
						typeof wo.aircraft === 'object' && wo.aircraft
							? `${wo.aircraft.registration_number || ''} ${wo.aircraft.model || ''}`.trim() ||
							  wo.aircraft.model ||
							  wo.aircraft.registration_number
							: aircraftLabelById.get(Number(wo.aircraft)) || (wo.aircraft ? `Aircraft #${wo.aircraft}` : '—'),
					assigned_to: resolveProfileName(wo.assignee, wo.assignee_name),
					status: wo.status,
					status_label: labelForWorkOrderStatus(wo.status),
					due_date: wo.due_by,
					description: wo.description,
				};
			}),
		[workOrders, profileById, partLabelById, aircraftLabelById]
	);

	const mappedDiscrepancies = useMemo(
		() =>
			discrepancies.map((d) => {
				const description = (d.description || '').trim();
				return {
					id: d.id,
					discrepancy_label: description
						? description.length > 56
							? `${description.slice(0, 56)}...`
							: description
						: `Discrepancy #${d.id}`,
					part_number: d.ata_code || '',
					aircraft:
						typeof d.aircraft === 'object' && d.aircraft
							? `${d.aircraft.registration_number || ''} ${d.aircraft.model || ''}`.trim() ||
							  d.aircraft.model ||
							  d.aircraft.registration_number
							: aircraftLabelById.get(Number(d.aircraft)) || (d.aircraft ? `Aircraft #${d.aircraft}` : '—'),
					status: d.status,
					status_label: labelForDiscrepancyStatus(d.status),
					description: d.description,
					reported_date: d.date_reported || '',
				};
			}),
		[discrepancies, aircraftLabelById]
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

	const woSuggestions = useMemo(
		() => buildWorkOrderSuggestions(workOrders, debouncedWoSearch),
		[workOrders, debouncedWoSearch]
	);

	const discSuggestions = useMemo(
		() => buildDiscrepancySuggestions(discrepancies, debouncedDiscSearch),
		[discrepancies, debouncedDiscSearch]
	);

	const searchedWorkOrders = useMemo(
		() =>
			filterMaintenanceWorkOrders(
				workOrders,
				displayedWorkOrders,
				debouncedWoSearch,
				woStatusFilters,
				profileById,
				partLabelById
			),
		[
			workOrders,
			displayedWorkOrders,
			debouncedWoSearch,
			woStatusFilters,
			profileById,
			partLabelById,
		]
	);

	const searchedDiscrepancies = useMemo(
		() =>
			filterMaintenanceDiscrepancies(
				discrepancies,
				displayedDiscrepancies,
				debouncedDiscSearch,
				discStatusFilters
			),
		[discrepancies, displayedDiscrepancies, debouncedDiscSearch, discStatusFilters]
	);

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
		() => getAllowedWorkOrderStatusOptions(),
		[]
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
				const assigneeId = Number(workorderForm.created_by);
				payload.assignee = assigneeId;
				payload.created_by = assigneeId;
			} else {
				payload.assignee = null;
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
		if (!canDeleteMaintenanceRecords) {
			setError('Only owners can delete work orders.');
			return;
		}
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

	const linkedDiscrepanciesForSelectedWo = useMemo(() => {
		if (!selectedWorkOrder?.id) return [];
		const woId = Number(selectedWorkOrder.id);
		return discrepancies.filter((d) => workOrderRefId(d.work_order) === woId);
	}, [discrepancies, selectedWorkOrder?.id]);

	const viewLinkedWorkOrder = (disc) => {
		const woId = workOrderRefId(disc?.work_order);
		if (woId == null) return;
		const wo = workOrders.find((w) => Number(w.id) === woId);
		if (!wo) {
			setError('Work order not found. Refresh the page and try again.');
			return;
		}
		closeDiscrepancyDetail();
		openWorkOrderDetail(wo);
	};

	const viewSourceDiscrepancy = (disc) => {
		if (!disc?.id) return;
		closeWorkOrderDetail();
		openDiscrepancyDetail(disc);
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
		if (!canDeleteMaintenanceRecords) {
			setError('Only owners can delete discrepancies.');
			return;
		}
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
			} else if (deleteConfirmType === 'discrepancy') {
				await deleteDiscrepancy(deleteConfirmId);
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

	const handleCloseAndSign = async () => {
		if (!selectedWorkOrder?.id) return;
		setError('');
		setSuccessMessage('');
		try {
			await closeWorkOrder(selectedWorkOrder.id, {
				completionNotes: closeWoNotes,
				laborHours: closeWoLaborHours,
			});
			const woLabel = selectedWorkOrder.title || `Work order #${selectedWorkOrder.id}`;
			setCloseWoDialogOpen(false);
			setCloseWoNotes('');
			setCloseWoLaborHours('');
			closeWorkOrderDetail();
			await refreshMaintenanceData();
			setSuccessMessage(`${woLabel} closed and signed off.`);
		} catch (e) {
			setError(e?.message || 'Failed to close work order.');
		}
	};

	const handleOpenWoFromDiscrepancy = async () => {
		if (!selectedDiscrepancy?.id) return;
		setError('');
		setSuccessMessage('');
		try {
			const newWo = await openWorkOrderFromDiscrepancy(selectedDiscrepancy.id);
			closeDiscrepancyDetail();
			await refreshMaintenanceData();
			setSuccessMessage(
				`Work order #${newWo?.id ?? ''} created from Discrepancy #${selectedDiscrepancy.id}.`
			);
		} catch (e) {
			setError(e?.message || 'Failed to create work order from discrepancy.');
		}
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
			if (!wo) return;
			openWorkOrderDetail(wo);
			if (editParam === '1') setWorkOrderDetailEditing(true);
			setDidHandleDeepLink(true);
			navigate('/maintenance', { replace: true });
			return;
		}

		if (discParam) {
			const discId = Number(discParam);
			const d = discrepancies.find((x) => Number(x?.id) === discId);
			if (!d) return;
			openDiscrepancyDetail(d);
			if (editParam === '1') setDiscrepancyDetailEditing(true);
			setDidHandleDeepLink(true);
			navigate('/maintenance', { replace: true });
			return;
		}

		setDidHandleDeepLink(true);
	}, [isLoading, didHandleDeepLink, location.search, workOrders, discrepancies, navigate]);
	
  return (
		<Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
			<Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3 }, minWidth: 0 }}>
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
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
					{error}
				</Alert>
			) : null}
			{successMessage ? (
				<Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
					{successMessage}
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
						value={dashboardKPIs?.pending_discrepancies ?? discrepancies.length}
						loading={isLoading}
						iconBgColor="#2196F315"
						iconColor="#2196F3"
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<KPICard
						icon={<BuildIcon />}
						label="Open"
						value={dashboardKPIs?.open_work_orders ?? workOrders.length}
						loading={isLoading}
						iconBgColor="#FF980015"
						iconColor="#FF9800"
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<KPICard
						icon={<WarningIcon />}
						label="Overdue"
						value={dashboardKPIs?.overdue ?? overdueWorkOrders.length}
						loading={isLoading}
						iconBgColor="#F4433615"
						iconColor="#F44336"
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<KPICard
						icon={<CheckCircleIcon />}
						label="Due Soon"
						value={dashboardKPIs?.due_soon ?? dueSoonWorkOrders.length}
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
						<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', width: '100%', minWidth: 0 }}>
							<CardContent sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
								<Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5 }}>
									Work Orders
								</Typography>
								<Box sx={{ mb: 2 }}>
									<ModuleSearchBar
										value={woSearch}
										onChange={setWoSearch}
										placeholder="Search work orders (title, tail, parts, assignee)…"
										suggestions={woSuggestions}
										statusOptions={WORK_ORDER_TABLE_FILTERS}
										statusValue={woStatusFilters}
										onStatusChange={setWoStatusFilters}
										statusMulti
										statusVariant="chips"
										resultCount={searchedWorkOrders.length}
										totalCount={displayedWorkOrders.length}
									/>
								</Box>

								{isLoading ? (
									<Stack alignItems="center" sx={{ py: 4 }}>
										<CircularProgress />
									</Stack>
								) : (
									<ScrollableTableContainer minWidth={1080}>
									<Table size="small" sx={{ '& .MuiTableCell-head': { whiteSpace: 'nowrap' } }}>
										<TableHead>
											<TableRow>
												<TableCell sx={{ minWidth: 160 }}>Title</TableCell>
												<TableCell sx={{ minWidth: 200 }}>Parts</TableCell>
												<TableCell sx={{ minWidth: 140 }}>Aircraft</TableCell>
												<TableCell sx={{ minWidth: 120 }}>Assigned</TableCell>
												<TableCell sx={{ minWidth: 100 }}>Status</TableCell>
												<TableCell sx={{ minWidth: 100 }}>Due</TableCell>
												<TableCell sx={{ minWidth: 200 }}>Description</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{searchedWorkOrders.map((order) => (
												<TableRow
													key={order.id}
													hover
													onClick={() => openWorkOrderDetail(workOrders.find((w) => w.id === order.id))}
													onKeyDown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault();
															openWorkOrderDetail(workOrders.find((w) => w.id === order.id));
														}
													}}
													tabIndex={0}
													role="button"
													sx={{ cursor: 'pointer' }}
												>
													<TableCell sx={{ minWidth: 160, whiteSpace: 'normal', wordBreak: 'break-word' }}>
														{order.work_order_label}
													</TableCell>
													<TableCell sx={{ maxWidth: 280 }}>
														{order.part_labels?.length ? (
															<Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
																{order.part_labels.slice(0, 3).map((label, idx) => (
																	<Chip
																		key={`${order.id}-part-${idx}`}
																		size="small"
																		label={label}
																		variant="outlined"
																		sx={{ maxWidth: 260 }}
																	/>
																))}
																{order.part_labels.length > 3 ? (
																	<Chip
																		size="small"
																		label={`+${order.part_labels.length - 3} more`}
																		sx={{ bgcolor: 'action.hover' }}
																	/>
																) : null}
															</Stack>
														) : (
															'—'
														)}
													</TableCell>
													<TableCell>{order.aircraft || '—'}</TableCell>
													<TableCell>{order.assigned_to || '—'}</TableCell>
													<TableCell>{order.status_label}</TableCell>
													<TableCell sx={{ whiteSpace: 'nowrap' }}>{order.due_date || '—'}</TableCell>
													<TableCell sx={{ minWidth: 180, whiteSpace: 'normal', wordBreak: 'break-word' }}>
														{order.description || '—'}
													</TableCell>
												</TableRow>
											))}
											{searchedWorkOrders.length === 0 ? (
												<TableRow>
													<TableCell colSpan={7} sx={{ color: 'text.secondary' }}>
														{maintenanceTableEmptyHint(
															'workorder',
															woStatusFilters,
															displayedWorkOrders.length,
															searchedWorkOrders.length,
															Boolean(debouncedWoSearch.trim())
														)}
													</TableCell>
												</TableRow>
											) : null}
										</TableBody>
									</Table>
									</ScrollableTableContainer>
								)}
							</CardContent>
						</Card>
					</Grid>

					<Grid item sx={{ width: '100%', flex: '0 0 auto' }}>
						<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', width: '100%', minWidth: 0 }}>
							<CardContent sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
								<Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5 }}>
									Discrepancies
								</Typography>
								<Box sx={{ mb: 2 }}>
									<ModuleSearchBar
										value={discSearch}
										onChange={setDiscSearch}
										placeholder="Search discrepancies (description, tail, ATA)…"
										suggestions={discSuggestions}
										statusOptions={DISCREPANCY_TABLE_FILTERS}
										statusValue={discStatusFilters}
										onStatusChange={setDiscStatusFilters}
										statusMulti
										statusVariant="chips"
										resultCount={searchedDiscrepancies.length}
										totalCount={displayedDiscrepancies.length}
									/>
								</Box>

								{isLoading ? (
									<Stack alignItems="center" sx={{ py: 4 }}>
										<CircularProgress />
									</Stack>
								) : (
									<ScrollableTableContainer minWidth={880}>
									<Table size="small" sx={{ '& .MuiTableCell-head': { whiteSpace: 'nowrap' } }}>
										<TableHead>
											<TableRow>
												<TableCell sx={{ minWidth: 100 }}>Discrepancy</TableCell>
												<TableCell sx={{ minWidth: 100 }}>Reported</TableCell>
												<TableCell sx={{ minWidth: 72 }}>ATA</TableCell>
												<TableCell sx={{ minWidth: 140 }}>Aircraft</TableCell>
												<TableCell sx={{ minWidth: 90 }}>Status</TableCell>
												<TableCell sx={{ minWidth: 200 }}>Description</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{searchedDiscrepancies.map((d) => (
												<TableRow
													key={d.id}
													hover
													onClick={() => openDiscrepancyDetail(discrepancies.find((x) => x.id === d.id))}
													onKeyDown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault();
															openDiscrepancyDetail(discrepancies.find((x) => x.id === d.id));
														}
													}}
													tabIndex={0}
													role="button"
													sx={{ cursor: 'pointer' }}
												>
													<TableCell>{d.discrepancy_label}</TableCell>
													<TableCell>{d.reported_date || '—'}</TableCell>
													<TableCell>{d.part_number || '—'}</TableCell>
													<TableCell>{d.aircraft || '—'}</TableCell>
													<TableCell>{d.status_label}</TableCell>
													<TableCell sx={{ minWidth: 180, whiteSpace: 'normal', wordBreak: 'break-word' }}>
														{d.description || '—'}
													</TableCell>
												</TableRow>
											))}
											{searchedDiscrepancies.length === 0 ? (
												<TableRow>
													<TableCell colSpan={6} sx={{ color: 'text.secondary' }}>
														{maintenanceTableEmptyHint(
															'discrepancy',
															discStatusFilters,
															displayedDiscrepancies.length,
															searchedDiscrepancies.length,
															Boolean(debouncedDiscSearch.trim())
														)}
													</TableCell>
												</TableRow>
											) : null}
										</TableBody>
									</Table>
									</ScrollableTableContainer>
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

				<Dialog
					open={workOrderDetailOpen}
					onClose={closeWorkOrderDetail}
					maxWidth="sm"
					fullWidth
				>
					{selectedWorkOrder && !workOrderDetailEditing ? (
						<MaintenanceRecordHeader
							eyebrow={`Work order #${selectedWorkOrder.id}`}
							primary={workOrderHeadline(selectedWorkOrder, 96)}
							secondary={parseAircraftFromEntity(selectedWorkOrder).full}
							status={selectedWorkOrder.status}
							statusKind="workorder"
							metaLine={
								[
									selectedWorkOrder.due_by ? `Due ${selectedWorkOrder.due_by}` : null,
									WORK_ORDER_PRIORITY_OPTIONS.find((p) => p.value === selectedWorkOrder.priority)
										?.label
										? `${WORK_ORDER_PRIORITY_OPTIONS.find((p) => p.value === selectedWorkOrder.priority)?.label} priority`
										: null,
								]
									.filter(Boolean)
									.join(' · ') || undefined
							}
							actions={
								<Chip
									size="small"
									variant="outlined"
									color={
										selectedWorkOrder.priority === 'critical'
											? 'error'
											: selectedWorkOrder.priority === 'high'
												? 'warning'
												: 'default'
									}
									label={
										WORK_ORDER_PRIORITY_OPTIONS.find((p) => p.value === selectedWorkOrder.priority)
											?.label || 'Medium'
									}
									sx={{ height: 26, fontWeight: 600, fontSize: '0.8125rem' }}
								/>
							}
						/>
					) : (
						<DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
							{workOrderDetailEditing
								? superviseMaintenance
									? 'Edit work order'
									: 'Update progress'
								: 'Work order'}
						</DialogTitle>
					)}
					<DialogContent dividers sx={{ px: 2, py: 1.5 }}>
						{selectedWorkOrder ? (
							<Stack spacing={1.75}>
								{!workOrderDetailEditing ? (
									<>
										<MaintenancePeopleStrip
											people={[
												{
													role: 'Created by',
													name: resolveProfileName(
														selectedWorkOrder.created_by,
														selectedWorkOrder.created_by_name
													),
												},
												{
													role: 'Assigned to',
													name: resolveProfileName(
														selectedWorkOrder.assignee,
														selectedWorkOrder.assignee_name
													),
												},
											]}
										/>
										<MaintenanceMetaGrid
											items={[
												{
													label: 'Aircraft',
													value: parseAircraftFromEntity(selectedWorkOrder).full,
												},
												{
													label: 'Parts',
													value:
														Array.isArray(selectedWorkOrder.parts_needed) &&
														selectedWorkOrder.parts_needed.length
															? selectedWorkOrder.parts_needed
																	.map((raw) => {
																		const id =
																			typeof raw === 'object' && raw != null ? raw.id : raw;
																		return partLabelById.get(id) || `#${id}`;
																	})
																	.join(', ')
															: 'None',
												},
												selectedWorkOrder.ATA_code != null && selectedWorkOrder.ATA_code !== ''
													? { label: 'ATA', value: selectedWorkOrder.ATA_code }
													: null,
												selectedWorkOrder.due_by
													? { label: 'Due', value: selectedWorkOrder.due_by }
													: null,
											].filter(Boolean)}
										/>
										{linkedDiscrepanciesForSelectedWo.length > 0 ? (
											<MaintenancePanelSection
												title={`Pilot report${linkedDiscrepanciesForSelectedWo.length > 1 ? 's' : ''}`}
											>
												<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
													{linkedDiscrepanciesForSelectedWo.map((d) => (
														<MaintenanceLinkButton
															key={d.id}
															label={discrepancyLinkLabel(d, 40)}
															onClick={() => viewSourceDiscrepancy(d)}
														/>
													))}
												</Stack>
											</MaintenancePanelSection>
										) : null}
										<MaintenanceDescriptionBlock
											title="Work scope"
											text={selectedWorkOrder.description}
										/>
										{selectedWorkOrder.signed_by ? (
											<MaintenanceMetaGrid
												items={[
													{
														label: 'Signed off',
														value: `${resolveProfileName(selectedWorkOrder.signed_by)}${
															selectedWorkOrder.signature_date
																? ` · ${selectedWorkOrder.signature_date}`
																: ''
														}`,
													},
												]}
											/>
										) : null}
										{selectedWorkOrder.completion_notes ? (
											<MaintenanceDescriptionBlock
												title="Completion notes"
												text={selectedWorkOrder.completion_notes}
											/>
										) : null}
										<LaborEntriesPanel
											workOrderId={selectedWorkOrder.id}
											canEdit={mechanicRole || superviseMaintenance || platformAdmin}
											mechanicUsers={mechanicUsers}
											currentUserId={state.user?.id}
											onChanged={refreshMaintenanceData}
											compact
										/>
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
					<DialogActions sx={detailDialogActionsSx}>
					{!workOrderDetailEditing ? (
						<>
							<Button onClick={closeWorkOrderDetail}>Close</Button>
							{canDeleteMaintenanceRecords ? (
								<Button color="error" onClick={() => handleDeleteWorkorder(selectedWorkOrder.id)}>
									Delete
								</Button>
							) : null}
							{selectedWorkOrder?.status !== 'closed' && (superviseMaintenance || mechanicRole) ? (
								<Button
									color="success"
									variant="outlined"
									onClick={() => {
										setCloseWoNotes('');
										setCloseWoDialogOpen(true);
									}}
								>
									Close &amp; Sign Off
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

				<Dialog
					open={discrepancyDetailOpen}
					onClose={closeDiscrepancyDetail}
					maxWidth="sm"
					fullWidth
				>
					{selectedDiscrepancy && !discrepancyDetailEditing ? (
						<MaintenanceRecordHeader
							eyebrow={`Discrepancy #${selectedDiscrepancy.id}`}
							primary={parseAircraftFromEntity(selectedDiscrepancy).tail}
							secondary={parseAircraftFromEntity(selectedDiscrepancy).model || undefined}
							summary={discrepancySummaryLine(selectedDiscrepancy)}
							status={selectedDiscrepancy.status}
							statusKind="discrepancy"
							statusLabel={labelForDiscrepancyStatus(selectedDiscrepancy.status)}
							metaLine={
								selectedDiscrepancy.date_reported
									? `Reported ${selectedDiscrepancy.date_reported}`
									: undefined
							}
							actions={
								workOrderRefId(selectedDiscrepancy.work_order) != null ? (
									<MaintenanceOpenRecordButton
										label="Open work order"
										onClick={() => viewLinkedWorkOrder(selectedDiscrepancy)}
									/>
								) : (
									<Chip
										size="small"
										label="No work order"
										variant="outlined"
										sx={{ height: 26, fontSize: '0.75rem' }}
									/>
								)
							}
						/>
					) : (
						<DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
							{discrepancyDetailEditing
								? superviseMaintenance
									? 'Edit discrepancy'
									: 'Update discrepancy'
								: 'Discrepancy'}
						</DialogTitle>
					)}
					<DialogContent dividers sx={{ px: 2, py: 1.5 }}>
						{selectedDiscrepancy ? (
							<Stack spacing={1.75}>
								{!discrepancyDetailEditing ? (
									<>
										{(() => {
											const woRef = selectedDiscrepancy.work_order;
											const wo =
												typeof woRef === 'object' && woRef != null ? woRef : null;
											const people = wo ? workOrderPeopleLabels(wo, profileById) : null;
											const personnel = [
												{
													role: 'Reported by',
													name: resolveProfileName(
														selectedDiscrepancy.reporter,
														selectedDiscrepancy.reporter_name
													),
												},
											];
											if (people?.openedBy && people.openedBy !== '—') {
												personnel.push({ role: 'WO opened by', name: people.openedBy });
											}
											if (people?.assignedTo && people.assignedTo !== '—') {
												personnel.push({ role: 'Assigned to', name: people.assignedTo });
											}
											return <MaintenancePeopleStrip people={personnel} />;
										})()}
										<MaintenanceMetaGrid
											items={[
												selectedDiscrepancy.ata_code
													? { label: 'ATA', value: selectedDiscrepancy.ata_code }
													: null,
												selectedDiscrepancy.tach_time
													? { label: 'Tach', value: selectedDiscrepancy.tach_time }
													: null,
												workOrderRefId(selectedDiscrepancy.work_order)
													? {
															label: 'Work order',
															value: `#${workOrderRefId(selectedDiscrepancy.work_order)}`,
														}
													: null,
											].filter(Boolean)}
										/>
										<MaintenanceDescriptionBlock
											title="Full squawk"
											text={selectedDiscrepancy.description}
										/>
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
					<DialogActions sx={detailDialogActionsSx}>
					{!discrepancyDetailEditing ? (
						<>
							<Button onClick={closeDiscrepancyDetail}>Close</Button>
							{canDeleteMaintenanceRecords ? (
								<Button color="error" onClick={() => handleDeleteDiscrepancy(selectedDiscrepancy.id)}>
									Delete
								</Button>
							) : null}
							{!selectedDiscrepancy?.work_order && (superviseMaintenance || mechanicRole) ? (
								<Button
									color="info"
									variant="outlined"
									onClick={handleOpenWoFromDiscrepancy}
								>
									Open Work Order
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

				<Dialog open={closeWoDialogOpen} onClose={() => setCloseWoDialogOpen(false)} maxWidth="xs" fullWidth>
					<DialogTitle>Close &amp; Sign Off Work Order</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Typography variant="body2" color="text.secondary">
								This will close the work order, record your sign-off, and automatically close all linked discrepancies.
							</Typography>
							<TextField
								label="Completion Notes (optional)"
								multiline
								minRows={3}
								value={closeWoNotes}
								onChange={(e) => setCloseWoNotes(e.target.value)}
								fullWidth
							/>
							<TextField
								label="Labor hours (this visit)"
								type="number"
								inputProps={{ min: 0.25, max: 24, step: 0.25 }}
								value={closeWoLaborHours}
								onChange={(e) => setCloseWoLaborHours(e.target.value)}
								helperText="Logged as a labor entry when you sign off"
								fullWidth
							/>
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button
							onClick={() => {
								setCloseWoDialogOpen(false);
								setCloseWoLaborHours('');
							}}
						>
							Cancel
						</Button>
						<Button variant="contained" color="success" onClick={handleCloseAndSign}>
							Close &amp; Sign Off
						</Button>
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