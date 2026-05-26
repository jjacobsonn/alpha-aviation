/**
 * Format aircraft from API payloads (nested object, numeric id, or string id).
 */
function normalizeAircraftField(value) {
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number' || typeof value === 'bigint') return String(value).trim();
	return '';
}

export function formatAircraftRef(aircraftRef, lookupById) {
	if (aircraftRef == null || aircraftRef === '') return '—';

	if (typeof aircraftRef === 'object') {
		const reg = normalizeAircraftField(aircraftRef.registration_number);
		const model = normalizeAircraftField(aircraftRef.model);
		if (reg && model) return `${reg} (${model})`;
		if (reg) return reg;
		if (model) return model;
		if (aircraftRef.id != null) return `Aircraft #${aircraftRef.id}`;
		return '—';
	}

	const id = Number(aircraftRef);
	if (lookupById && Number.isFinite(id)) {
		const fromMap = lookupById.get(id);
		if (fromMap) return fromMap;
	}
	return Number.isFinite(id) ? `Aircraft #${id}` : String(aircraftRef);
}

/** Entity with nested `aircraft` (discrepancy, work order). */
export function formatEntityAircraft(entity, lookupById) {
	if (!entity?.aircraft) return '—';
	return formatAircraftRef(entity.aircraft, lookupById);
}

export function aircraftRefId(aircraftRef) {
	if (aircraftRef == null || aircraftRef === '') return null;
	if (typeof aircraftRef === 'object') return aircraftRef.id != null ? Number(aircraftRef.id) : null;
	const n = Number(aircraftRef);
	return Number.isFinite(n) ? n : null;
}
