import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import SiteAdminPortal from '../../pages/SiteAdminPortal';

jest.mock('react-router', () => ({
 	...jest.requireActual('react-router'),
 	useNavigate: () => jest.fn(),
}));

jest.mock('../../shared/Api', () => ({ }));

test('Site admin portal renders heading', () => {
 	render(
 		<MemoryRouter>
 			<SiteAdminPortal />
 		</MemoryRouter>
 	);

 	expect(screen.getByText(/Site Admin/i)).toBeInTheDocument();
});
