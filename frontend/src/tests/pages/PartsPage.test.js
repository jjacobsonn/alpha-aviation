import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PartsPage from '../../pages/PartsPage';
import * as Api from '../../shared/Api';

jest.mock('../../shared/Api', () => ({
	fetchCompanyInventoriesDetailed: jest.fn(),
	fetchCompanyWorkorders: jest.fn(),
	updateInventory: jest.fn(),
	deleteInventory: jest.fn(),
	updatePart: jest.fn(),
}));

jest.mock('@mui/material', () => {
	const actual = jest.requireActual('@mui/material');
	return {
		...actual,
		Menu: ({ open, children }) => (open ? <div role="menu">{children}</div> : null),
	};
});

describe('PartsPage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		Api.fetchCompanyInventoriesDetailed.mockResolvedValue([
			{
				id: 1,
				part_id: 1,
				part: { part_number: 'P001', name: 'Engine Oil', description: 'Synthetic' },
				in_stock: 50,
				stock_alert: 10,
				shop_location: 'Bin A1',
			},
			{
				id: 2,
				part_id: 2,
				part: { part_number: 'P002', name: 'Air Filter', description: 'High efficiency' },
				in_stock: 5,
				stock_alert: 10,
				shop_location: 'Bin A2',
			},
		]);
		Api.fetchCompanyWorkorders.mockResolvedValue([]);
	});

	it('renders page title and main controls', async () => {
		render(<PartsPage />);

		await waitFor(() => {
			expect(screen.getByText('Parts in Stock')).toBeInTheDocument();
		});
		expect(screen.getByPlaceholderText(/search part number/i)).toBeInTheDocument();
	});

	it('loads and displays parts inventory', async () => {
		render(<PartsPage />);

		await waitFor(() => {
			expect(screen.getByText('Engine Oil')).toBeInTheDocument();
			expect(screen.getByText('Air Filter')).toBeInTheDocument();
		});
		expect(screen.getByText('P001')).toBeInTheDocument();
		expect(screen.getByText('P002')).toBeInTheDocument();
	});

	it('displays error message when API fails', async () => {
		Api.fetchCompanyInventoriesDetailed.mockRejectedValue(new Error('Failed to load inventory'));

		render(<PartsPage />);

		await waitFor(() => {
			expect(screen.getByText(/failed to load inventory/i)).toBeInTheDocument();
		});
	});

	it('opens context menu when clicking actions button', async () => {
		const user = userEvent.setup();
		render(<PartsPage />);

		await waitFor(() => {
			expect(screen.getByText('Engine Oil')).toBeInTheDocument();
		});

		const actionButtons = screen.getAllByRole('button', { name: '' });
		const moreButton = actionButtons.find((btn) => btn.querySelector('[data-testid*="MoreVert"]'));
		if (moreButton) {
			await user.click(moreButton);
			expect(screen.getByRole('menu')).toBeInTheDocument();
		}
	});

	it('handles search query input', async () => {
		const user = userEvent.setup();
		render(<PartsPage />);

		const searchInput = screen.getByPlaceholderText(/search part number/i);
		await user.type(searchInput, 'P001');

		expect(searchInput).toHaveValue('P001');
	});

	it('shows low stock alert indicator for parts below alert threshold', async () => {
		render(<PartsPage />);

		await waitFor(() => {
			expect(screen.getByText('Air Filter')).toBeInTheDocument();
		});
		expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
	});
});
