import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import FleetPage from '../../pages/FleetPage';

jest.mock('react-router', () => ({
 	...jest.requireActual('react-router'),
 	useNavigate: () => jest.fn(),
}));

jest.mock('../../shared/Api', () => ({
 	fetchFleetAircraft: jest.fn(),
}));

jest.mock('../../context/AppContext', () => ({
	useAppContext: () => ({
		state: {
			user: { role: 'manager', companyId: 1 },
			viewAsUser: null,
		},
	}),
}));

const { fetchFleetAircraft } = require('../../shared/Api');

test('Fleet page renders and displays aircraft rows', async () => {
 	fetchFleetAircraft.mockResolvedValue([
 		{ id: 1, registration_number: 'N12345', model: 'C172' },
 	]);

 	render(
 		<MemoryRouter>
 			<FleetPage />
 		</MemoryRouter>
 	);

 	expect(screen.getByText(/Fleet/i)).toBeInTheDocument();

 	await waitFor(() => {
 		expect(screen.getByText('N12345')).toBeInTheDocument();
 	});
});
