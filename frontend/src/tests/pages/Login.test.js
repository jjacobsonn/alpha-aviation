import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../../pages/Login';
import { AppContext } from '../../context/AppContext';
import { loginUser, fetchCurrentUser } from '../../shared/Api';

const mockNavigate = jest.fn();

jest.mock('react-router', () => ({
	...jest.requireActual('react-router'),
	useNavigate: () => mockNavigate,
	useLocation: () => ({ pathname: '/login', state: null }),
}));

jest.mock('../../shared/Api', () => ({
	loginUser: jest.fn(),
	fetchCurrentUser: jest.fn(),
}));

const renderLogin = (state = { user: {} }) => {
	const mockDispatch = jest.fn();
	return render(
		<AppContext.Provider value={{ state, dispatch: mockDispatch }}>
			<Login />
		</AppContext.Provider>
	);
};

describe('Login page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
	});

	test('renders login form with username and password fields', () => {
		renderLogin();

		expect(screen.getByRole('textbox', { name: /username/i })).toBeInTheDocument();
		const passwordInput = Array.from(document.querySelectorAll('input')).find(inp => inp.type === 'password');
		expect(passwordInput).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
	});

	test('navigates to mechanic dashboard after successful login', async () => {
		const user = userEvent.setup();
		loginUser.mockResolvedValue({});
		fetchCurrentUser.mockResolvedValue({
			id: 1,
			username: 'mechanic_user',
			company_role: 'mechanic',
		});

		renderLogin();

		const usernameInput = screen.getByRole('textbox', { name: /username/i });
		const passwordInput = Array.from(document.querySelectorAll('input')).find(inp => inp.type === 'password');
		
		await user.type(usernameInput, 'mechanic_user');
		await user.type(passwordInput, 'password123');
		await user.click(screen.getByRole('button', { name: /sign in/i }));

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith('/maintenance', { replace: true });
		});
	});

	test('navigates to management dashboard for manager role', async () => {
		const user = userEvent.setup();
		loginUser.mockResolvedValue({});
		fetchCurrentUser.mockResolvedValue({
			id: 2,
			username: 'manager_user',
			company_role: 'manager',
		});

		renderLogin();

		const usernameInput = screen.getByRole('textbox', { name: /username/i });
		const passwordInput = Array.from(document.querySelectorAll('input')).find(inp => inp.type === 'password');
		
		await user.type(usernameInput, 'manager_user');
		await user.type(passwordInput, 'password123');
		await user.click(screen.getByRole('button', { name: /sign in/i }));

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith('/management', { replace: true });
		});
	});

	test('navigates to dispatcher dashboard for dispatcher role', async () => {
		const user = userEvent.setup();
		loginUser.mockResolvedValue({});
		fetchCurrentUser.mockResolvedValue({
			id: 3,
			username: 'sarah.mitchell',
			company_role: 'dispatcher',
		});

		renderLogin();

		const usernameInput = screen.getByRole('textbox', { name: /username/i });
		const passwordInput = Array.from(document.querySelectorAll('input')).find(inp => inp.type === 'password');
		
		await user.type(usernameInput, 'sarah.mitchell');
		await user.type(passwordInput, 'password123');
		await user.click(screen.getByRole('button', { name: /sign in/i }));

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith('/dispatcher-dashboard', { replace: true });
		});
	});

	test('displays error message on failed login', async () => {
		const user = userEvent.setup();
		loginUser.mockRejectedValue(new Error('Invalid credentials'));

		renderLogin();

		const usernameInput = screen.getByRole('textbox', { name: /username/i });
		const passwordInput = Array.from(document.querySelectorAll('input')).find(inp => inp.type === 'password');
		
		await user.type(usernameInput, 'user');
		await user.type(passwordInput, 'wrong');
		await user.click(screen.getByRole('button', { name: /sign in/i }));

		expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	test('redirects to management when already authenticated with valid tokens', () => {
		localStorage.setItem('accessToken', 'token');
		localStorage.setItem('refreshToken', 'refresh');

		renderLogin({
			user: { role: 'owner', isStaff: false },
			initialized: true,
			isAuthenticated: true,
		});

		expect(mockNavigate).toHaveBeenCalledWith('/management', { replace: true });
	});

	test('toggles password visibility when clicking visibility icon', async () => {
		const user = userEvent.setup();
		renderLogin();

		const passwordInput = Array.from(document.querySelectorAll('input')).find(inp => inp.type === 'password');
		expect(passwordInput).toHaveAttribute('type', 'password');

		const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i });
		await user.click(toggleButton);

		expect(passwordInput).toHaveAttribute('type', 'text');
	});
});
