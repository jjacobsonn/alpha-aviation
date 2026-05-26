jest.mock('react-router', () => ({
	...jest.requireActual('react-router'),
	useSearchParams: () => [new URLSearchParams('tab=tools'), jest.fn()],
}));

jest.mock('../../context/AppContext', () => ({
	useAppContext: () => ({
		state: { user: { role: 'manager' }, viewAsUser: null },
	}),
}));

jest.mock('../../shared/Api', () => ({
	fetchTools: jest.fn(),
	fetchToolCalibrationHistory: jest.fn(),
	fetchCompanyUsers: jest.fn().mockResolvedValue([
		{ id: 1, first_name: 'Pat', last_name: 'Smith', company_role: 'mechanic' },
	]),
	createTool: jest.fn(),
	updateTool: jest.fn(),
	deleteTool: jest.fn(),
	recordToolCalibration: jest.fn(),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToolsCalibrationPanel from '../../components/parts/ToolsCalibrationPanel';

const { fetchTools } = require('../../shared/Api');

const sampleTools = [
	{
		id: 1,
		name: 'Torque Wrench',
		serial_number: 'TW-001',
		calibration_due_date: '2026-12-01',
		calibration_alert: 'green',
		status: 'available',
	},
	{
		id: 2,
		name: 'Multimeter',
		serial_number: 'MM-002',
		calibration_due_date: '2020-01-01',
		calibration_alert: 'red',
		status: 'overdue',
	},
];

describe('ToolsCalibrationPanel', () => {
	beforeEach(() => {
		fetchTools.mockResolvedValue(sampleTools);
	});

	it('renders tools table', async () => {
		render(<ToolsCalibrationPanel />);
		await waitFor(() => {
			expect(screen.getByText('Torque Wrench')).toBeInTheDocument();
		});
		expect(screen.getByText('Add tool')).toBeInTheDocument();
	});

	it('filters to overdue via stat card', async () => {
		const user = userEvent.setup();
		render(<ToolsCalibrationPanel />);
		await waitFor(() => {
			expect(screen.getByText('Torque Wrench')).toBeInTheDocument();
		});
		await user.click(screen.getAllByText('Overdue')[0]);
		expect(screen.queryByText('Torque Wrench')).not.toBeInTheDocument();
		expect(screen.getByText('Multimeter')).toBeInTheDocument();
	});
});
