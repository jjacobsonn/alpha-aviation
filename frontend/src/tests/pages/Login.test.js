import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../../pages/Login';
import { AppContext } from '../../context/AppContext';
import { loginUser, fetchCurrentUser } from '../../shared/Api';

const mockNavigate = jest.fn();
const mockUseLocation = jest.fn(() => ({ pathname: '/login' }));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => mockNavigate,
	useLocation: () => mockUseLocation(),
}));

jest.mock('../../shared/Api', () => ({
	loginUser: jest.fn(),
	fetchCurrentUser: jest.fn(),
}));

const renderLogin = (state = { user: {}, isAuthenticated: false }, dispatch = jest.fn()) => {
	return render(
		<AppContext.Provider value={{ state, dispatch }}>
			<Login />
		</AppContext.Provider>
	);
};

const getFieldByName = (name) => {
	const input = document.querySelector(`input[name="${name}"]`);
	if (!input) {
		throw new Error(`Expected input with name="${name}" to exist`);
	}
	return input;
};

describe('Login page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
		mockUseLocation.mockReturnValue({ pathname: '/login', state: null });
	});

	it('renders login form fields and submit button', () => {
		renderLogin();

		expect(screen.getByText('Aviation Management')).toBeInTheDocument();
		expect(getFieldByName('username')).toBeInTheDocument();
		expect(getFieldByName('password')).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /sign in/i })
		).toBeInTheDocument();
	});

	it('redirects to management when tokens already exist', () => {
		localStorage.setItem('accessToken', 'existing-access-token');
		localStorage.setItem('refreshToken', 'existing-refresh-token');

		renderLogin({ user: { role: 'owner' }, isAuthenticated: true });

		expect(mockNavigate).toHaveBeenCalledWith('/management', { replace: true });
	});

	it('submits credentials and navigates to mechanic landing on success', async () => {
		const user = userEvent.setup();
		const mockDispatch = jest.fn();
		loginUser.mockResolvedValue({});
		fetchCurrentUser.mockResolvedValue({
			id: 1,
			username: 'zach',
			company_role: 'mechanic',
		});

		renderLogin({ user: {}, isAuthenticated: false }, mockDispatch);

		await user.type(getFieldByName('username'), 'zach');
		await user.type(getFieldByName('password'), 'super-secret');
		await user.click(screen.getByRole('button', { name: /sign in/i }));

		await waitFor(() => {
			expect(loginUser).toHaveBeenCalledWith(
				{ username: 'zach', password: 'super-secret' },
				mockDispatch
			);
		});
		expect(fetchCurrentUser).toHaveBeenCalled();

		expect(mockNavigate).toHaveBeenCalledWith('/maintenance', { replace: true });
	});

	it('shows an error message when login fails', async () => {
		const user = userEvent.setup();
		loginUser.mockRejectedValue(new Error('Invalid credentials'));

		renderLogin();

		await user.type(getFieldByName('username'), 'zach');
		await user.type(getFieldByName('password'), 'bad-password');
		await user.click(screen.getByRole('button', { name: /sign in/i }));

		expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it('toggles password visibility when clicking the visibility button', async () => {
		const user = userEvent.setup();
		renderLogin();

		const passwordInput = getFieldByName('password');
		const toggleButton = screen.getByRole('button', {
			name: /toggle password visibility/i,
		});

		expect(passwordInput).toHaveAttribute('type', 'password');
		await user.click(toggleButton);
		expect(passwordInput).toHaveAttribute('type', 'text');
		await user.click(toggleButton);
		expect(passwordInput).toHaveAttribute('type', 'password');
	});
});
