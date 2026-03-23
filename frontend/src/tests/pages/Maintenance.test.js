import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Maintenance from '../../pages/Maintenance';

jest.mock('../../components/AddWorkOrderForm', () => {
	return function MockAddWorkOrderForm({ isOpen, onClose }) {
		return (
			<div data-testid="add-work-order-form">
				<span>{isOpen ? 'work-order-open' : 'work-order-closed'}</span>
				<button onClick={onClose} type="button">
					close work order form
				</button>
			</div>
		);
	};
});

jest.mock('../../components/AddDiscrepancyForm', () => {
	return function MockAddDiscrepancyForm({ isOpen, onClose }) {
		return (
			<div data-testid="add-discrepancy-form">
				<span>{isOpen ? 'discrepancy-open' : 'discrepancy-closed'}</span>
				<button onClick={onClose} type="button">
					close discrepancy form
				</button>
			</div>
		);
	};
});

describe('Maintenance page', () => {
	it('renders KPI cards and section headings', () => {
		render(<Maintenance />);

		expect(screen.getByText('Pending')).toBeInTheDocument();
		expect(screen.getByText('Open')).toBeInTheDocument();
		expect(screen.getByText('Overdue')).toBeInTheDocument();
		expect(screen.getByText('Due Soon')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Open Work Orders' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Pending Work Orders' })).toBeInTheDocument();
	});

	it('renders representative work order and discrepancy data', () => {
		render(<Maintenance />);

		expect(screen.getByText('assigned to: John Doe')).toBeInTheDocument();
		expect(screen.getByText('due: 2025-12-10')).toBeInTheDocument();
		expect(screen.getByText('D001')).toBeInTheDocument();
		expect(screen.getByText('D010')).toBeInTheDocument();
		expect(screen.getAllByText(/assigned to:/i)).toHaveLength(10);
	});

	it('opens and closes add work order form', async () => {
		const user = userEvent.setup();
		render(<Maintenance />);

		expect(screen.getByText('work-order-closed')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /add work order/i }));
		expect(screen.getByText('work-order-open')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /close work order form/i }));
		expect(screen.getByText('work-order-closed')).toBeInTheDocument();
	});

	it('opens and closes add discrepancy form', async () => {
		const user = userEvent.setup();
		render(<Maintenance />);

		expect(screen.getByText('discrepancy-closed')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /add discrepancy/i }));
		expect(screen.getByText('discrepancy-open')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /close discrepancy form/i }));
		expect(screen.getByText('discrepancy-closed')).toBeInTheDocument();
	});
});
