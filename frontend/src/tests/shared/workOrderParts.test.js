import {
	companyFleetParts,
	partsForWorkOrderAircraft,
	partAircraftId,
	filterPartIdsForAircraft,
} from '../../shared/workOrderParts';

const aircraft = [
	{ id: 1, registration_number: 'N172HF' },
	{ id: 6, registration_number: 'N350HF' },
];

const parts = [
	{ id: 1, part_number: 'PN-A', name: 'Oil filter', aircraft: 1 },
	{ id: 2, part_number: 'PN-B', name: 'Brake pad', aircraft: { id: 6, registration_number: 'N350HF' } },
	{ id: 3, part_number: 'PN-C', name: 'Shop only', aircraft: null },
];

describe('workOrderParts', () => {
	test('companyFleetParts excludes shop-only lines', () => {
		expect(companyFleetParts(parts, aircraft).map((p) => p.id)).toEqual([1, 2]);
	});

	test('partsForWorkOrderAircraft filters by tail', () => {
		const kingAir = partsForWorkOrderAircraft(parts, aircraft, '6');
		expect(kingAir.map((p) => p.id)).toEqual([2]);
		expect(partAircraftId(kingAir[0])).toBe(6);
	});

	test('filterPartIdsForAircraft keeps only matching tail', () => {
		expect(filterPartIdsForAircraft([1, 2], parts, aircraft, '6')).toEqual([2]);
	});
});
