import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import DispatcherDashboard from '../../pages/DispatcherDashboard';

jest.mock('react-router', () => ({
 	...jest.requireActual('react-router'),
 	useLocation: () => ({ search: '' }),
}));

jest.mock('../../shared/Api', () => ({
 	fetchCompanyFlights: jest.fn(),
}));

jest.mock('../../context/AppContext', () => ({
 	useAppContext: () => ({ state: { user: { role: 'dispatcher', companyId: 1 } } }),
}));

const { fetchCompanyFlights } = require('../../shared/Api');

test('Dispatcher dashboard renders and shows flights', async () => {
 	fetchCompanyFlights.mockResolvedValue([{ id: 1, flight_number: 'FL123', status: 'approved' }]);

 	render(
 		<MemoryRouter>
 			<DispatcherDashboard />
 		</MemoryRouter>
 	);

 	expect(screen.getByText(/Dispatch/i)).toBeInTheDocument();

 	await waitFor(() => expect(screen.getByText(/FL123/i)).toBeInTheDocument());
});
