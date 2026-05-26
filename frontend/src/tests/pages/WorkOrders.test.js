import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import WorkOrders from '../../pages/WorkOrders';

jest.mock('react-router', () => ({
 	...jest.requireActual('react-router'),
 	useNavigate: () => jest.fn(),
 	useSearchParams: () => [new URLSearchParams('')],
}));

jest.mock('../../shared/Api', () => ({
 	fetchCompanyWorkorders: jest.fn(),
 	fetchCompanyAircrafts: jest.fn(),
 	fetchCompanyUsers: jest.fn(),
 	fetchCompanyDiscrepancies: jest.fn(),
 	fetchParts: jest.fn(),
}));

jest.mock('../../context/AppContext', () => ({
 	useAppContext: () => ({ state: { user: { role: 'manager' } } }),
}));

const { fetchCompanyWorkorders, fetchCompanyAircrafts, fetchCompanyUsers, fetchCompanyDiscrepancies, fetchParts } = require('../../shared/Api');

test('WorkOrders page renders and shows work order rows', async () => {
 	fetchCompanyWorkorders.mockResolvedValue([{ id: 5, title: 'Replace tire', aircraft: 1 }]);
 	fetchCompanyAircrafts.mockResolvedValue([{ id: 1, registration_number: 'N777' }]);
 	fetchCompanyUsers.mockResolvedValue([]);
 	fetchCompanyDiscrepancies.mockResolvedValue([]);
 	fetchParts.mockResolvedValue([]);

 	render(
 		<MemoryRouter>
 			<WorkOrders />
 		</MemoryRouter>
 	);

 	expect(
 		screen.getByRole('heading', { name: /Work Orders/i, level: 4 })
 	).toBeInTheDocument();

 	await waitFor(() => expect(screen.getByText(/Replace tire/i)).toBeInTheDocument());
});
