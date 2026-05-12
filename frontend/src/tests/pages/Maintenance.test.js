import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Maintenance from '../../pages/Maintenance';
import { MemoryRouter } from 'react-router';
import * as Api from '../../shared/Api';

// Use real react-router hooks with MemoryRouter (don't mock react-router)

jest.mock('../../context/AppContext', () => ({
	useAppContext: () => ({
		state: {
			user: {
				role: 'manager',
				companyId: 1,
			},
		},
		dispatch: jest.fn(),
	}),
}));

jest.mock('../../components/AddWorkOrderForm', () => {
	return function MockAddWorkOrderForm({ isOpen, onClose }) {
		return (
			<div data-testid="add-work-order-form">
				{isOpen ? <span>Work Order Form Open</span> : <span>Work Order Form Closed</span>}
				<button onClick={onClose} type="button">
					Close
				</button>
			</div>
		);
	};
});

jest.mock('../../components/AddDiscrepancyForm', () => {
	return function MockAddDiscrepancyForm({ isOpen, onClose }) {
		return (
			<div data-testid="add-discrepancy-form">
				{isOpen ? <span>Discrepancy Form Open</span> : <span>Discrepancy Form Closed</span>}
				<button onClick={onClose} type="button">
					Close
				</button>
			</div>
		);
	};
});

jest.mock('../../shared/Api', () => ({
	fetchCompanyWorkorders: jest.fn(),
	fetchCompanyDiscrepancies: jest.fn(),
	fetchCompanyAircrafts: jest.fn(),
	fetchCompanyUsers: jest.fn(),
	fetchParts: jest.fn(),
	createWorkorder: jest.fn(),
	createDiscrepancy: jest.fn(),
	updateWorkorder: jest.fn(),
	updateDiscrepancy: jest.fn(),
	deleteWorkorder: jest.fn(),
	deleteDiscrepancy: jest.fn(),
}));

const mockWorkOrders = [
	{
		id: 101,
		created_by: {
			first_name: 'John',
			last_name: 'Doe',
		},
		due_date: '2025-12-10',
		status: 'open',
		priority: 'high',
		description: 'Engine inspection',
	},
];

const mockDiscrepancies = [
	{
		id: 201,
		ata_code: 'D001',
		status: 'pending',
		description: 'Hydraulic leak',
	},
	{
		id: 202,
		ata_code: 'D010',
		status: 'closed',
		description: 'Cabin light issue',
	},
];

const renderMaintenance = () =>
	render(
		<MemoryRouter initialEntries={['/maintenance']}>
			<Maintenance />
		</MemoryRouter>
	);

describe('Maintenance page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		Api.fetchCompanyWorkorders.mockResolvedValue(mockWorkOrders);
		Api.fetchCompanyDiscrepancies.mockResolvedValue(mockDiscrepancies);
		Api.fetchCompanyAircrafts.mockResolvedValue([]);
		Api.fetchCompanyUsers.mockResolvedValue([]);
		Api.fetchParts.mockResolvedValue([]);
	});

	it('renders page with KPI section and headings', async () => {
		renderMaintenance();

		await waitFor(() => {
			expect(screen.getByText('Open')).toBeInTheDocument();
			expect(screen.getByText('Pending')).toBeInTheDocument();
		});
	});

	it('displays work orders and discrepancies data', async () => {
		renderMaintenance();

		await waitFor(() => {
			expect(screen.getByText('John Doe')).toBeInTheDocument();
			expect(screen.getByText('D001')).toBeInTheDocument();
			expect(screen.getByText('D010')).toBeInTheDocument();
		});
	});

	it('shows assignee information for work orders and discrepancies', async () => {
		renderMaintenance();

		await waitFor(() => {
			expect(screen.getByText('John Doe')).toBeInTheDocument();
		});
	});

	it('opens add work order form when button is clicked', async () => {
		const user = userEvent.setup();
		renderMaintenance();

		expect(screen.queryByRole('dialog', { name: /create work order/i })).not.toBeInTheDocument();

		const addWorkOrderButton = screen.getByRole('button', { name: /add work order/i });
		await user.click(addWorkOrderButton);

		const dialog = await screen.findByRole('dialog', { name: /create work order/i });
		expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
	});

	it('closes add work order form when close button is clicked', async () => {
		const user = userEvent.setup();
		renderMaintenance();

		expect(screen.queryByRole('dialog', { name: /create work order/i })).not.toBeInTheDocument();

		const addWorkOrderButton = screen.getByRole('button', { name: /add work order/i });
		await user.click(addWorkOrderButton);

		const dialog = await screen.findByRole('dialog', { name: /create work order/i });

		const cancelButton = within(dialog).getByRole('button', { name: /cancel/i });
		await user.click(cancelButton);

		await waitFor(() => expect(screen.queryByRole('dialog', { name: /create work order/i })).not.toBeInTheDocument());
	});

	it('opens add discrepancy form when button is clicked', async () => {
		const user = userEvent.setup();
		renderMaintenance();

		expect(screen.queryByRole('dialog', { name: /create discrepancy/i })).not.toBeInTheDocument();

		const addDiscrepancyButton = screen.getByRole('button', { name: /add discrepancy/i });
		await user.click(addDiscrepancyButton);

		await screen.findByRole('dialog', { name: /create discrepancy/i });
	});

	it('displays loading state while fetching data', () => {
		Api.fetchCompanyWorkorders.mockImplementation(() => new Promise(() => {})); // Never resolves

		renderMaintenance();

		const bars = screen.getAllByRole('progressbar');
		expect(bars.length).toBeGreaterThan(0);
	});

	it('handles API error gracefully', async () => {
		Api.fetchCompanyWorkorders.mockRejectedValue(new Error('Failed to fetch'));

		renderMaintenance();

		await waitFor(() => {
			expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
		});
	});
});
