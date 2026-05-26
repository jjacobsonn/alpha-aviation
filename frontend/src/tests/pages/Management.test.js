import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Management from '../../pages/Management';

jest.mock('react-router', () => ({
 	...jest.requireActual('react-router'),
 	useNavigate: () => jest.fn(),
}));

jest.mock('../../shared/Api', () => ({ }));

jest.mock('../../context/AppContext', () => ({
 	useAppContext: () => ({ state: { user: { role: 'manager' } } }),
}));

test('Management page renders main heading', () => {
 	render(
 		<MemoryRouter>
 			<Management />
 		</MemoryRouter>
 	);

 	expect(screen.getByText(/Management/i)).toBeInTheDocument();
});
