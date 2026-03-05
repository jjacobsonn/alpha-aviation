import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PartsPage from '../../pages/PartsPage';

jest.mock('@mui/material', () => {
	const actual = jest.requireActual('@mui/material');
	return {
		...actual,
		Menu: ({ open, children }) => (open ? <div role="menu">{children}</div> : null),
	};
});

describe('PartsPage', () => {
	it('renders high-level page elements', () => {
		render(<PartsPage />);

		expect(screen.getByText('Parts in Stock')).toBeInTheDocument();
		expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
		expect(screen.getByText('Actions')).toBeInTheDocument();
	});

	it('opens and closes the row actions menu', async () => {
		const user = userEvent.setup();
		render(<PartsPage />);

		const iconButtons = screen.getAllByRole('button');
		await user.click(iconButtons[0]);

		expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();

		await user.click(screen.getByRole('menuitem', { name: 'Edit' }));

		await waitFor(() => {
			expect(
				screen.queryByRole('menuitem', { name: 'Delete' })
			).not.toBeInTheDocument();
		});
	});
});
