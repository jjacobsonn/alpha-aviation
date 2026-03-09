import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAppContext } from '../../context/AppContext';

// Mock the useAppContext hook
jest.mock('../../context/AppContext', () => ({
	useAppContext: jest.fn(),
}));

// Mock the react-router Navigate component
jest.mock('react-router', () => ({
	...jest.requireActual('react-router'),
	Navigate: ({ to, state, replace }) => (
		<div data-testid="navigate-mock" data-to={to} data-replace={replace.toString()}>
			Navigate to {to}
		</div>
	),
	useLocation: jest.fn(),
}));

const mockLocation = {
	pathname: '/dashboard',
	search: '',
	hash: '',
	state: undefined,
};

describe('ProtectedRoute', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Mock useLocation
		const { useLocation } = require('react-router');
		useLocation.mockReturnValue(mockLocation);
	});

	it('renders loading spinner when not initialized', () => {
		useAppContext.mockReturnValue({
			state: {
				initialized: false,
				isAuthenticated: true,
			},
		});

		render(
			<BrowserRouter>
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>
			</BrowserRouter>
		);

		// Check for CircularProgress component by its SVG
		const spinner = screen.getByRole('progressbar');
		expect(spinner).toBeInTheDocument();

		// Ensure protected content is not visible
		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('redirects to login when not authenticated', () => {
		useAppContext.mockReturnValue({
			state: {
				initialized: true,
				isAuthenticated: false,
			},
		});

		render(
			<BrowserRouter>
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>
			</BrowserRouter>
		);

		const navigateMock = screen.getByTestId('navigate-mock');
		expect(navigateMock).toBeInTheDocument();
		expect(navigateMock).toHaveAttribute('data-to', '/login');
		expect(navigateMock).toHaveAttribute('data-replace', 'true');

		// Ensure protected content is not visible
		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('renders children when authenticated and initialized', () => {
		useAppContext.mockReturnValue({
			state: {
				initialized: true,
				isAuthenticated: true,
			},
		});

		render(
			<BrowserRouter>
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>
			</BrowserRouter>
		);

		expect(screen.getByText('Protected Content')).toBeInTheDocument();
		expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
		expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();
	});

	it('prioritizes loading state over authentication check', () => {
		useAppContext.mockReturnValue({
			state: {
				initialized: false,
				isAuthenticated: false,
			},
		});

		render(
			<BrowserRouter>
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>
			</BrowserRouter>
		);

		// Should show loading spinner, not redirect
		const spinner = screen.getByRole('progressbar');
		expect(spinner).toBeInTheDocument();
		expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();
	});

	it('renders multiple children elements', () => {
		useAppContext.mockReturnValue({
			state: {
				initialized: true,
				isAuthenticated: true,
			},
		});

		render(
			<BrowserRouter>
				<ProtectedRoute>
					<div>Content 1</div>
					<div>Content 2</div>
				</ProtectedRoute>
			</BrowserRouter>
		);

		expect(screen.getByText('Content 1')).toBeInTheDocument();
		expect(screen.getByText('Content 2')).toBeInTheDocument();
	});
});
