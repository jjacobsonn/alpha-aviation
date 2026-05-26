import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import FleetDetailPage from '../../pages/FleetDetailPage';

jest.mock('react-router', () => ({
 	...jest.requireActual('react-router'),
 	useParams: () => ({ id: '1' }),
}));

jest.mock('../../shared/Api', () => ({
 	fetchFleetAircraftDetail: jest.fn(),
 	fetchAircraftIntervals: jest.fn(),
}));

jest.mock('../../context/AppContext', () => ({
 	useAppContext: () => ({ state: { user: { role: 'mechanic' } } }),
}));

const { fetchFleetAircraftDetail, fetchAircraftIntervals } = require('../../shared/Api');

test('Fleet detail shows aircraft registration and intervals', async () => {
 	fetchFleetAircraftDetail.mockResolvedValue({ id: 1, registration_number: 'N123', model: 'C172' });
 	fetchAircraftIntervals.mockResolvedValue([
 		{ id: 11, name: 'Oil change', interval_type: 'hours' },
 	]);

 	render(
 		<MemoryRouter>
 			<FleetDetailPage />
 		</MemoryRouter>
 	);

 	await waitFor(() => expect(screen.getByText('N123')).toBeInTheDocument());
 	await waitFor(() => expect(screen.getByText('Oil change')).toBeInTheDocument());
});
