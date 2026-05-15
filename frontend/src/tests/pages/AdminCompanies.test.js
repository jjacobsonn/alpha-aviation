import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminCompanies from '../../pages/AdminCompanies';

jest.mock('react-router', () => ({
 	...jest.requireActual('react-router'),
 	useNavigate: () => jest.fn(),
}));

jest.mock('../../shared/Api', () => ({
 	makeApiRequest: jest.fn(),
}));

const { makeApiRequest } = require('../../shared/Api');

test('AdminOrganizations page lists companies', async () => {
 	makeApiRequest.mockResolvedValue([{ id: 2, name: 'Acme Aviation', locations: 'Dallas' }]);

 	render(
 		<MemoryRouter>
 			<AdminCompanies />
 		</MemoryRouter>
 	);

 	expect(screen.getByRole('heading', { name: /Organizations/i })).toBeInTheDocument();

 	await waitFor(() => expect(screen.getByText(/Acme Aviation/i)).toBeInTheDocument());
});