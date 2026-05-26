import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminCompanyForm from '../../pages/AdminCompanyForm';

jest.mock('react-router', () => ({
 	...jest.requireActual('react-router'),
 	useNavigate: () => jest.fn(),
}));

jest.mock('../../shared/Api', () => ({
 	makeApiRequest: jest.fn(),
}));

test('AdminCompanyForm renders form and submit button', () => {
 	render(
 		<MemoryRouter>
 			<AdminCompanyForm />
 		</MemoryRouter>
 	);

 	expect(screen.getByText(/New organization/i)).toBeInTheDocument();
 	expect(screen.getByRole('button', { name: /Create company/i })).toBeInTheDocument();
});
