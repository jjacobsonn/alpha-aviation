import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotFound from '../../pages/NotFound';

const mockNavigate = jest.fn();

jest.mock('react-router', () => ({
	...jest.requireActual('react-router'),
	useNavigate: () => mockNavigate,
}));

describe('NotFound page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders basic 404 content', () => {
		render(<NotFound />);

		expect(screen.getByText('404')).toBeInTheDocument();
		expect(screen.getByText('Page Not Found')).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /go to login/i })
		).toBeInTheDocument();
	});

	it('navigates to login when button is clicked', async () => {
		const user = userEvent.setup();
		render(<NotFound />);

		await user.click(screen.getByRole('button', { name: /go to login/i }));

		expect(mockNavigate).toHaveBeenCalledWith('/');
	});
});
