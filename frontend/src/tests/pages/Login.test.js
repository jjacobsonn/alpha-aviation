import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../../pages/Login';
import { AppContext } from '../../context/AppContext';
import { loginUser } from '../../shared/Api';

const mockNavigate = jest.fn();
const mockUseLocation = jest.fn();

jest.mock('react-router', () => ({
	...jest.requireActual('react-router'),
	useNavigate: () => mockNavigate,
	useLocation: () => mockUseLocation(),
}));

jest.mock('../../shared/Api', () => ({
	loginUser: jest.fn(),
}));

const renderLogin = (dispatch = jest.fn()) => {
	return render(
		<AppContext.Provider value={{ dispatch }}>
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
		mockUseLocation.mockReturnValue({ state: null });
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

		renderLogin();

		expect(mockNavigate).toHaveBeenCalledWith('/management', { replace: true });
	});

	it('submits credentials and navigates to requested page on success', async () => {
		const user = userEvent.setup();
		const mockDispatch = jest.fn();
		mockUseLocation.mockReturnValue({
			state: { from: { pathname: '/maintenance' } },
		});
		loginUser.mockResolvedValue({});

		renderLogin(mockDispatch);

		await user.type(getFieldByName('username'), 'zach');
		await user.type(getFieldByName('password'), 'super-secret');
		await user.click(screen.getByRole('button', { name: /sign in/i }));

		await waitFor(() => {
			expect(loginUser).toHaveBeenCalledWith(
				{ username: 'zach', password: 'super-secret' },
				mockDispatch
			);
		});

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
