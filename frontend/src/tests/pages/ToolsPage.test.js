jest.mock('react-router', () => ({
	...jest.requireActual('react-router'),
	useSearchParams: () => [new URLSearchParams('tool=2'), jest.fn()],
	Navigate: ({ to }) => <div data-testid="navigate">{to}</div>,
}));

import { render, screen } from '@testing-library/react';
import ToolsPage from '../../pages/ToolsPage';

describe('ToolsPage', () => {
	it('redirects to Parts calibrated tools tab', () => {
		render(<ToolsPage />);
		expect(screen.getByTestId('navigate')).toHaveTextContent('/parts?tab=tools&tool=2');
	});
});
