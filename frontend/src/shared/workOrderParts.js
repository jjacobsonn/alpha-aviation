/** Part row aircraft id (null = not in a tail catalog). */
export function partAircraftId(part) {
	if (!part) return null;
	const aircraft = part.aircraft;
	if (typeof aircraft === 'object' && aircraft != null) return aircraft.id;
	if (aircraft === '' || aircraft == null) return null;
	return aircraft;
}

/** Parts tied to an aircraft in the active fleet list. */
export function companyFleetParts(parts, aircraftList) {
	const list = Array.isArray(parts) ? parts : [];
	const aircraftIds = new Set(
		(Array.isArray(aircraftList) ? aircraftList : [])
			.map((a) => Number(a?.id))
			.filter(Number.isFinite)
	);
	return list.filter((p) => {
		const aid = partAircraftId(p);
		return aid != null && aircraftIds.has(Number(aid));
	});
}

/** Parts catalogued for the work order's aircraft only. */
export function partsForWorkOrderAircraft(parts, aircraftList, workOrderAircraftId) {
	if (workOrderAircraftId === '' || workOrderAircraftId == null) return [];
	const woAid = Number(workOrderAircraftId);
	if (!Number.isFinite(woAid)) return [];
	return companyFleetParts(parts, aircraftList).filter(
		(p) => Number(partAircraftId(p)) === woAid
	);
}

/** Drop part ids that are not on the selected aircraft catalog. */
export function filterPartIdsForAircraft(partIds, parts, aircraftList, aircraftId) {
	const allowed = new Set(
		partsForWorkOrderAircraft(parts, aircraftList, aircraftId).map((p) => Number(p.id))
	);
	return (partIds || []).map(Number).filter((id) => Number.isFinite(id) && allowed.has(id));
}
