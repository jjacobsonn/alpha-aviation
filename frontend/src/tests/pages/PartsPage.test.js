jest.mock('react-router', () => ({
	...jest.requireActual('react-router'),
	Link: ({ children, to }) => <a href={to}>{children}</a>,
	useNavigate: () => jest.fn(),
	useSearchParams: () => [new URLSearchParams(), jest.fn()],
}));

jest.mock('../../components/parts/ToolsCalibrationPanel', () => () => null);

jest.mock('../../context/AppContext', () => ({
	useAppContext: () => ({
		state: { user: { role: 'owner' }, viewAsUser: null },
	}),
}));

jest.mock('../../shared/Api', () => ({
	fetchCompanyInventoriesDetailed: jest.fn().mockResolvedValue([
		{
			id: 10,
			in_stock: 5,
			stock_alert: 2,
			shop_location: 'Shelf A',
			part: {
				id: 1,
				part_number: 'PN-100',
				name: 'Test Part',
				description: 'Desc',
			},
			tracked_units_count: 0,
		},
	]),
	fetchCompanyWorkorders: jest.fn().mockResolvedValue([]),
	fetchCompanyAircrafts: jest.fn().mockResolvedValue([]),
	deleteInventory: jest.fn(),
	createInventory: jest.fn(),
	createPart: jest.fn(),
	updateInventory: jest.fn(),
	updatePart: jest.fn(),
}));

import { render, screen } from '@testing-library/react';
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
		expect(
			screen.getByPlaceholderText('Search part number, name, description, location…')
		).toBeInTheDocument();
		expect(screen.getByText('Actions')).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Inventory' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Calibration' })).toBeInTheDocument();
	});

});
