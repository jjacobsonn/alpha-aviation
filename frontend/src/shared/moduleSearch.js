import { formatAircraftRef } from './aircraftDisplay';
import { profileDisplayName } from './profileDisplay';

export function normalizeSearchQuery(q) {
	return (q || '').trim().toLowerCase();
}

export function textIncludes(blob, q) {
	if (!q) return true;
	return String(blob || '').toLowerCase().includes(q);
}

export function buildSuggestions(candidates, q, limit = 8) {
	const nq = normalizeSearchQuery(q);
	if (nq.length < 2) return [];
	const out = [];
	const seen = new Set();
	for (const raw of candidates) {
		const s = String(raw || '').trim();
		if (!s || seen.has(s)) continue;
		if (s.toLowerCase().includes(nq)) {
			seen.add(s);
			out.push(s);
			if (out.length >= limit) return out;
		}
	}
	return out;
}

/** @deprecated Combined maintenance bar — use per-table filters below. */
export const MAINTENANCE_STATUS_FILTERS = [
	{ value: 'all', label: 'All' },
	{ value: 'open', label: 'Open' },
	{ value: 'pending', label: 'Pending' },
	{ value: 'closed', label: 'Closed' },
	{ value: 'discrepancy', label: 'Discrepancy' },
	{ value: 'work_order', label: 'Work Order' },
];

export const WORK_ORDER_TABLE_FILTERS = [
	{ value: 'all', label: 'All' },
	{ value: 'open', label: 'Open' },
	{ value: 'closed', label: 'Closed' },
];

export const DISCREPANCY_TABLE_FILTERS = [
	{ value: 'all', label: 'All' },
	{ value: 'pending', label: 'Pending' },
	{ value: 'closed', label: 'Closed' },
];

export const PARTS_STATUS_FILTERS = [
	{ value: 'all', label: 'All' },
	{ value: 'low_stock', label: 'Low stock' },
	{ value: 'in_stock', label: 'In stock' },
	{ value: 'out_of_stock', label: 'Out of stock' },
];

export const PARTS_SORT_OPTIONS = [
	{ value: 'newest', label: 'Newest first' },
	{ value: 'oldest', label: 'Oldest first' },
	{ value: 'part_number_asc', label: 'Part number (A–Z)' },
	{ value: 'part_number_desc', label: 'Part number (Z–A)' },
];

export const TOOLS_STATUS_FILTERS = [
	{ value: 'all', label: 'All' },
	{ value: 'overdue', label: 'Overdue' },
	{ value: 'due_soon', label: 'Due soon' },
	{ value: 'ok', label: 'OK' },
];

export const DISPATCH_STATUS_FILTERS = [
	{ value: 'all', label: 'All' },
	{ value: 'pending', label: 'Pending' },
	{ value: 'approved', label: 'Approved' },
	{ value: 'completed', label: 'Completed' },
];

function workOrderSearchBlob(wo, row, profileById, partLabelById) {
	const parts =
		Array.isArray(wo?.parts_needed) && wo.parts_needed.length
			? wo.parts_needed
					.map((raw) => {
						const id = typeof raw === 'object' && raw != null ? raw.id : raw;
						return partLabelById?.get(id) || `#${id}`;
					})
					.join(' ')
			: '';
	const createdBy =
		typeof wo?.created_by === 'object'
			? profileDisplayName(wo.created_by)
			: profileById?.get(Number(wo?.created_by)) || '';
	return [
		wo?.id,
		wo?.title,
		wo?.description,
		wo?.status,
		row?.status_label,
		formatAircraftRef(wo?.aircraft),
		parts,
		createdBy,
		wo?.priority,
		wo?.due_by,
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
}

function discrepancySearchBlob(d, row) {
	return [
		d?.id,
		d?.description,
		d?.ata_code,
		d?.tach_time,
		d?.status,
		row?.status_label,
		formatAircraftRef(d?.aircraft),
		d?.reporter_name,
		typeof d?.reporter === 'object' ? profileDisplayName(d.reporter) : '',
		d?.date_reported,
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
}

const MAINTENANCE_TYPE_FILTERS = ['work_order', 'discrepancy'];
const MAINTENANCE_STATUS_FILTER_KEYS = ['open', 'pending', 'closed'];

/** Accept string (legacy), array, or empty — always returns a string[]. */
export function normalizeMaintenanceFilters(activeFilters) {
	if (Array.isArray(activeFilters)) {
		return activeFilters.filter((f) => f && f !== 'all');
	}
	if (activeFilters == null || activeFilters === '' || activeFilters === 'all') {
		return [];
	}
	return [String(activeFilters)];
}

function recordMatchesStatusFilter(kind, status, statusFilter) {
	const s = String(status || '').toLowerCase();
	if (kind === 'workorder') {
		if (statusFilter === 'pending') return false;
		if (statusFilter === 'open') return s !== 'closed';
		if (statusFilter === 'closed') return s === 'closed';
		return false;
	}
	if (statusFilter === 'open' || statusFilter === 'pending') return s === 'pending';
	if (statusFilter === 'closed') return s === 'closed';
	return false;
}

/** Multiple chips: type filters AND status filters (each group is OR within, AND across groups). */
export function matchesMaintenanceRecordFilters(kind, status, activeFilters) {
	const filters = normalizeMaintenanceFilters(activeFilters);
	if (filters.length === 0) return true;

	const types = filters.filter((f) => MAINTENANCE_TYPE_FILTERS.includes(f));
	const statuses = filters.filter((f) => MAINTENANCE_STATUS_FILTER_KEYS.includes(f));

	if (types.length > 0) {
		const kindKey = kind === 'workorder' ? 'work_order' : 'discrepancy';
		if (!types.includes(kindKey)) return false;
	}

	if (statuses.length > 0) {
		const ok = statuses.some((sf) => recordMatchesStatusFilter(kind, status, sf));
		if (!ok) return false;
	}

	return true;
}

/** Back-compat alias (older call sites used singular name). */
export function matchesMaintenanceRecordFilter(kind, status, activeFilters) {
	return matchesMaintenanceRecordFilters(kind, status, activeFilters);
}

export function maintenanceTableEmptyHint(
	kind,
	activeFilters,
	displayedCount,
	matchCount,
	hasSearchText
) {
	const filters = normalizeMaintenanceFilters(activeFilters);
	const types = filters.filter((f) => MAINTENANCE_TYPE_FILTERS.includes(f));

	if (displayedCount === 0) {
		return kind === 'workorder' ? 'No work orders found.' : 'No discrepancies found.';
	}
	if (types.length === 1 && types[0] === 'work_order' && kind === 'discrepancy') {
		return 'Work Order filter is active — add Discrepancy or clear filters.';
	}
	if (types.length === 1 && types[0] === 'discrepancy' && kind === 'workorder') {
		return 'Discrepancy filter is active — add Work Order or clear filters.';
	}
	if (matchCount === 0) {
		return hasSearchText
			? `No ${kind === 'workorder' ? 'work orders' : 'discrepancies'} match your search.`
			: `No ${kind === 'workorder' ? 'work orders' : 'discrepancies'} match the selected filters.`;
	}
	return '';
}

export function filterMaintenanceWorkOrders(
	workOrders,
	mappedRows,
	q,
	statusFilter,
	profileById,
	partLabelById
) {
	const nq = normalizeSearchQuery(q);
	return mappedRows.filter((row) => {
		const wo = workOrders.find((w) => w.id === row.id);
		if (!wo) return false;
		if (!matchesMaintenanceRecordFilters('workorder', wo.status, statusFilter)) return false;
		if (!nq) return true;
		return textIncludes(workOrderSearchBlob(wo, row, profileById, partLabelById), nq);
	});
}

export function filterMaintenanceDiscrepancies(discrepancies, mappedRows, q, statusFilter) {
	const nq = normalizeSearchQuery(q);
	return mappedRows.filter((row) => {
		const d = discrepancies.find((x) => x.id === row.id);
		if (!d) return false;
		if (!matchesMaintenanceRecordFilters('discrepancy', d.status, statusFilter)) return false;
		if (!nq) return true;
		return textIncludes(discrepancySearchBlob(d, row), nq);
	});
}

export function buildMaintenanceSuggestions(workOrders, discrepancies, q) {
	return [
		...buildWorkOrderSuggestions(workOrders, q),
		...buildDiscrepancySuggestions(discrepancies, q),
	].slice(0, 8);
}

export function buildWorkOrderSuggestions(workOrders, q) {
	const lines = [];
	(workOrders || []).forEach((wo) => {
		lines.push(formatAircraftRef(wo.aircraft));
		if (wo.title) lines.push(wo.title);
		if (wo.description) {
			const line = (wo.description || '').split(/\r?\n/)[0].trim();
			if (line) lines.push(line.length > 48 ? `${line.slice(0, 47)}…` : line);
		}
	});
	return buildSuggestions(lines, q);
}

export function buildDiscrepancySuggestions(discrepancies, q) {
	const lines = [];
	(discrepancies || []).forEach((d) => {
		lines.push(formatAircraftRef(d.aircraft));
		const line = (d.description || '').split(/\r?\n/)[0].trim();
		if (line) lines.push(line.length > 48 ? `${line.slice(0, 47)}…` : line);
		if (d.ata_code) lines.push(`ATA ${d.ata_code}`);
	});
	return buildSuggestions(lines, q);
}

export function filterPartsRows(rows, q, statusFilter) {
	const nq = normalizeSearchQuery(q);
	return (rows || []).filter((row) => {
		if (statusFilter === 'low_stock' && !row.lowStock) return false;
		if (statusFilter === 'in_stock' && Number(row.inStock ?? 0) <= 0) return false;
		if (statusFilter === 'out_of_stock' && Number(row.inStock ?? 0) > 0) return false;
		if (!nq) return true;
		const blob = [row.pn, row.partName, row.partDescription, row.location, row.shopLocation]
			.join(' ')
			.toLowerCase();
		return textIncludes(blob, nq);
	});
}

export function buildPartsSuggestions(rows, q) {
	return buildSuggestions(
		(rows || []).flatMap((r) => [r.pn, r.partName, r.partDescription, r.shopLocation]),
		q
	);
}

function toolMatchesStatusFilter(tool, statusFilter) {
	const alert = tool?.calibration_alert;
	if (statusFilter === 'overdue') return alert === 'red';
	if (statusFilter === 'due_soon') return alert === 'amber';
	if (statusFilter === 'ok') return alert === 'green';
	return true;
}

export function filterToolsRows(tools, q, statusFilter) {
	const nq = normalizeSearchQuery(q);
	return (tools || []).filter((tool) => {
		if (!toolMatchesStatusFilter(tool, statusFilter)) return false;
		if (!nq) return true;
		const blob = [tool.name, tool.serial_number, tool.description, tool.location]
			.join(' ')
			.toLowerCase();
		return textIncludes(blob, nq);
	});
}

export function buildToolsSuggestions(tools, q) {
	return buildSuggestions(
		(tools || []).flatMap((t) => [t.name, t.serial_number, t.location, t.description]),
		q
	);
}

export function filterDispatchFlights(flights, q, statusFilter, aircraftFilterId) {
	const nq = normalizeSearchQuery(q);
	let list = flights || [];
	if (aircraftFilterId) {
		list = list.filter((f) => {
			const aircraftId =
				typeof f?.aircraft === 'object' && f?.aircraft != null ? f.aircraft.id : f?.aircraft;
			return String(aircraftId) === String(aircraftFilterId);
		});
	}
	if (statusFilter === 'pending') {
		list = list.filter((f) => f?.status === 'pending approval');
	} else if (statusFilter === 'approved') {
		list = list.filter((f) => f?.status === 'approved' || f?.status === 'scheduled');
	} else if (statusFilter === 'completed') {
		list = list.filter((f) => f?.status === 'completed');
	}
	if (!nq) return list;
	return list.filter((f) => {
		const blob = [
			f.flight_number,
			f.origin,
			f.destination,
			f.aircraft_name,
			formatAircraftRef(f.aircraft),
			f.status,
			f.pilot_name,
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		return textIncludes(blob, nq);
	});
}

export function buildDispatchSuggestions(flights, q) {
	return buildSuggestions(
		(flights || []).flatMap((f) => [
			f.flight_number,
			f.origin && f.destination ? `${f.origin} → ${f.destination}` : null,
			f.aircraft_name,
			formatAircraftRef(f.aircraft),
		]),
		q
	);
}

export function filterFleetRows(rows, q, statusFilter, locationFilter, typeFilter) {
	const nq = normalizeSearchQuery(q);
	return (rows || []).filter((a) => {
		if (statusFilter && a.fleet_status !== statusFilter) return false;
		if (locationFilter && String(a.location || '') !== locationFilter) return false;
		if (typeFilter && String(a.aircraft_type || '') !== typeFilter) return false;
		if (!nq) return true;
		const blob = [
			a.registration_number,
			a.model,
			a.location,
			a.aircraft_type,
			a.fleet_status,
			a.manufacturer,
		]
			.join(' ')
			.toLowerCase();
		return textIncludes(blob, nq);
	});
}

export function buildFleetSuggestions(rows, q) {
	return buildSuggestions(
		(rows || []).flatMap((a) => [
			a.registration_number,
			a.model,
			a.location,
			a.aircraft_type,
		]),
		q
	);
}
