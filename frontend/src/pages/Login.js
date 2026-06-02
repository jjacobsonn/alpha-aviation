import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
	Box,
	Container,
	Card,
	CardContent,
	TextField,
	Button,
	Typography,
	Alert,
	Stack,
	InputAdornment,
	IconButton
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { AppContext } from '../context/AppContext';
import { ACTION_TYPES } from '../context/AppContext';
import { loginUser, fetchCurrentUser } from '../shared/Api';
import { getDefaultRouteForUser } from '../shared/rbac';

const Login = () => {
	const navigate = useNavigate();
	const { state, dispatch } = useContext(AppContext);
	const location = useLocation();
	const [formData, setFormData] = useState({
		username: '',
		password: '',
	});
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!state.initialized) return;

    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (!accessToken || !refreshToken || !state.isAuthenticated) return;

    const user = state.user;
    if (!user?.role && !user?.isStaff && !user?.isSuperuser) return;

    const defaultPath = getDefaultRouteForUser({
      company_role: user.role,
      role: user.role,
      is_staff: user.isStaff,
      is_superuser: user.isSuperuser,
    });
    const onEntryRoute = location.pathname === '/login' || location.pathname === '/';
    if (defaultPath !== '/login' && onEntryRoute && location.pathname !== defaultPath) {
      navigate(defaultPath, { replace: true });
    }
  }, [navigate, state.initialized, state.isAuthenticated, state.user, location.pathname]);

	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
		if (error) setError('');
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setIsLoading(true);

		try {
			await loginUser(formData, dispatch);
			const userData = await fetchCurrentUser();
			dispatch({
				type: ACTION_TYPES.UPDATE_USER,
				payload: userData,
			});

			if (userData.must_change_password) {
				navigate('/change-password', { replace: true });
				return;
			}

			const defaultPath = getDefaultRouteForUser(userData);
			if (defaultPath === '/login') {
				throw new Error('Your account does not have a configured frontend role yet.');
			}

			navigate(defaultPath, {
				replace: true,
			});
		} catch (err) {
			console.error('Login error:', err);
			setError(err.message || 'Login failed. Please check your credentials.');
		} finally {
			setIsLoading(false);
		}
	};

	const handleClickShowPassword = () => {
		setShowPassword(!showPassword);
	};

	return (
		<Box
			sx={{
				minHeight: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'linear-gradient(135deg, #FF4C05 0%, #CC3A00 50%, #FF4C05 100%)',
			}}
		>
			<Container maxWidth="sm">
				<Card
					elevation={0}
					sx={{
						border: '1px solid',
						borderColor: 'divider',
						borderRadius: 3,
					}}
				>
					<CardContent sx={{ p: 4 }}>
						{/* Logo/Header */}
						<Stack spacing={3} alignItems="center" sx={{ mb: 4 }}>
							<img
								src="/logo.png"
								alt="Alpha Aviation"
								style={{ height: 56, width: 56 }}
							/>
							<Typography variant="h4" sx={{ fontWeight: 700 }}>
								Alpha Aviation
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Sign in to access your account
							</Typography>
						</Stack>

						{error && (
							<Alert severity="error" sx={{ mb: 3 }}>
								{error}
							</Alert>
						)}
						<form onSubmit={handleSubmit} noValidate>
							<Stack spacing={3}>
								<TextField
									fullWidth
									label="Username"
									name="username"
									value={formData.username}
									onChange={handleChange}
									required
									autoFocus
									disabled={isLoading}
									variant="outlined"
								/>

								<TextField
									fullWidth
									label="Password"
									name="password"
									type={showPassword ? 'text' : 'password'}
									value={formData.password}
									onChange={handleChange}
									required
									disabled={isLoading}
									variant="outlined"
									InputProps={{
										endAdornment: (
											<InputAdornment position="end">
												<IconButton
													aria-label="toggle password visibility"
													onClick={handleClickShowPassword}
													edge="end"
													type="button"
												>
													{showPassword ? <VisibilityOff /> : <Visibility />}
												</IconButton>
											</InputAdornment>
										),
									}}
								/>

								<Button
									type="submit"
									fullWidth
									variant="contained"
									size="large"
									disabled={isLoading}
									sx={{
										py: 1.5,
									}}
								>
									{isLoading ? 'Signing in...' : 'Sign In'}
								</Button>
							</Stack>
						</form>

						{/* Footer */}
						<Box sx={{ mt: 3, textAlign: 'center' }}>
							<Typography variant="caption" color="text.secondary">
								For access issues, contact your system administrator
							</Typography>
						</Box>
					</CardContent>
				</Card>
			</Container>
		</Box>
	);
};

export default Login;
