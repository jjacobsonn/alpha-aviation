import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Management from '../../pages/Management';

jest.mock('react-router', () => ({
 	...jest.requireActual('react-router'),
 	useNavigate: () => jest.fn(),
}));

jest.mock('../../shared/Api', () => ({
	fetchCompanyWorkorders: jest.fn(),
	fetchCompanyDiscrepancies: jest.fn(),
	fetchCompanyUsers: jest.fn(),
	fetchManagementDashboard: jest.fn(),
	fetchFleetAvailabilityDashboard: jest.fn(),
	fetchCompanyAircrafts: jest.fn(),
	createProfile: jest.fn(),
	updateProfile: jest.fn(),
	adminResetPassword: jest.fn(),
}));

jest.mock('../../components/RecurringDiscrepancyTable', () => () => <div data-testid="recurring-discrepancy-table" />);
jest.mock('../../components/FleetUtilizationGraph', () => () => <div data-testid="fleet-utilization-graph" />);
jest.mock('../../components/UptimeDowntimeGraph', () => () => <div data-testid="uptime-downtime-graph" />);
jest.mock('../../components/management/FleetAvailabilityPanel', () => () => <div data-testid="fleet-availability-panel" />);
jest.mock('../../components/management/FleetStatusPanel', () => () => <div data-testid="fleet-status-panel" />);

jest.mock('../../context/AppContext', () => ({
 	useAppContext: () => ({ state: { user: { role: 'manager' } } }),
}));

const Api = require('../../shared/Api');

test('Management page renders main heading', async () => {
	Api.fetchCompanyWorkorders.mockResolvedValue([]);
	Api.fetchCompanyDiscrepancies.mockResolvedValue([]);
	Api.fetchCompanyUsers.mockResolvedValue([]);
	Api.fetchManagementDashboard.mockResolvedValue({ counts: {} });
	Api.fetchFleetAvailabilityDashboard.mockResolvedValue({});
	Api.fetchCompanyAircrafts.mockResolvedValue([]);
	Api.createProfile.mockResolvedValue({});
	Api.updateProfile.mockResolvedValue({});
	Api.adminResetPassword.mockResolvedValue({});

 	render(
 		<MemoryRouter>
 			<Management />
 		</MemoryRouter>
 	);

	await waitFor(() => {
		expect(screen.getByRole('heading', { name: /welcome back/i, level: 4 })).toBeInTheDocument();
	});
});
