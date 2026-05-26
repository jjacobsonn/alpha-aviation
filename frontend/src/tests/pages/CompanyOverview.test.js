import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CompanyOverview from '../../pages/CompanyOverview';

jest.mock('react-router', () => ({
 	...jest.requireActual('react-router'),
 	useNavigate: () => jest.fn(),
}));

jest.mock('../../context/AppContext', () => ({
 	useAppContext: () => ({
 		state: { user: { role: 'manager' } },
 		dispatch: jest.fn(),
 	}),
}));

jest.mock('../../shared/Api', () => ({
 	makeApiRequest: jest.fn(),
}));

test('CompanyOverview renders heading', () => {
 	render(
 		<MemoryRouter>
 			<CompanyOverview />
 		</MemoryRouter>
 	);

 	expect(screen.getByRole('heading', { name: /Company/i })).toBeInTheDocument();
});
