import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PilotDashboard from '../../pages/PilotDashboard';

jest.mock('react-router', () => ({
 	...jest.requireActual('react-router'),
 	useLocation: () => ({ search: '' }),
}));

jest.mock('../../shared/Api', () => ({
 	createCompanyFlightRequest: jest.fn(),
 	createDiscrepancy: jest.fn(),
 	fetchCompanyAircrafts: jest.fn(),
 	fetchCompanyDiscrepancies: jest.fn(),
 	fetchCompanyFlights: jest.fn(),
 	fetchCurrentUser: jest.fn(),
 	fetchCompanyUsers: jest.fn(),
}));

jest.mock('../../context/AppContext', () => ({
 	useAppContext: () => ({ state: { user: { role: 'pilot', companyId: 1 } } }),
}));

const {
 	fetchCompanyFlights,
 	fetchCurrentUser,
 	fetchCompanyAircrafts,
 	fetchCompanyDiscrepancies,
 	fetchCompanyUsers,
} = require('../../shared/Api');

test('Pilot dashboard renders and shows flights', async () => {
 	fetchCurrentUser.mockResolvedValue({ id: 1, username: 'pilot1', company_role: 'pilot' });
 	fetchCompanyAircrafts.mockResolvedValue([]);
 	fetchCompanyDiscrepancies.mockResolvedValue([]);
 	fetchCompanyUsers.mockResolvedValue([]);
 	fetchCompanyFlights.mockResolvedValue([
 		{ id: 2, flight_number: 'PF321', status: 'scheduled', primary_pilot: 1 },
 	]);

 	render(
 		<MemoryRouter>
 			<PilotDashboard />
 		</MemoryRouter>
 	);

 	expect(screen.getByRole('heading', { name: /Pilot/i })).toBeInTheDocument();

 	await waitFor(() => expect(screen.getByText(/PF321/i)).toBeInTheDocument());
});
