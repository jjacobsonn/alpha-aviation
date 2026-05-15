import { parseWorkOrderTitle, workOrderHeadline, workOrderSourceLabel } from '../../shared/workOrderDisplay';

describe('workOrderDisplay', () => {
	it('strips discrepancy boilerplate from headline', () => {
		const row = {
			id: 7,
			title: 'WO from Discrepancy #3: COM1 intermittently loses transmit audio above 8k ft',
		};
		expect(workOrderHeadline(row)).toBe(
			'COM1 intermittently loses transmit audio above 8k ft'
		);
		expect(workOrderSourceLabel(row)).toBe('From discrepancy #3');
	});

	it('uses description when title is only discrepancy stub', () => {
		const row = {
			id: 2,
			title: 'WO from Discrepancy #5',
			description: 'Hydraulic leak at left main gear',
		};
		expect(workOrderHeadline(row)).toBe('Hydraulic leak at left main gear');
	});

	it('keeps normal titles unchanged', () => {
		const row = { id: 1, title: 'Annual inspection — left mag' };
		expect(workOrderHeadline(row)).toBe('Annual inspection — left mag');
		expect(workOrderSourceLabel(row)).toBeNull();
	});

	it('parseWorkOrderTitle handles missing colon body', () => {
		expect(parseWorkOrderTitle('WO from Discrepancy #9')).toEqual({
			fromDiscrepancy: true,
			discrepancyId: '9',
			summary: '',
		});
	});
});
