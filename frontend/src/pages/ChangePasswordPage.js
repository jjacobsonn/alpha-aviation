import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Container,
	IconButton,
	InputAdornment,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { changeOwnPassword } from '../shared/Api';
import { useAppContext, ACTION_TYPES } from '../context/AppContext';
import { getDefaultRouteForUser } from '../shared/rbac';

const ChangePasswordPage = () => {
	const navigate = useNavigate();
	const { state, dispatch } = useAppContext();
	const [form, setForm] = useState({ password: '', confirm: '' });
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const validatePassword = (pw) => {
		if (pw.length < 8) return 'Password must be at least 8 characters.';
		if (!/[A-Z]/.test(pw)) return 'Must contain at least one uppercase letter.';
		if (!/[a-z]/.test(pw)) return 'Must contain at least one lowercase letter.';
		if (!/\d/.test(pw)) return 'Must contain at least one digit.';
		if (!/[!@#$%^&*()_+\-=[\]{}|;:',.<>?/`~]/.test(pw))
			return 'Must contain at least one special character.';
		return null;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		const pw = form.password.trim();
		const confirm = form.confirm.trim();

		if (!pw || !confirm) {
			setError('Both fields are required.');
			return;
		}
		if (pw !== confirm) {
			setError('Passwords do not match.');
			return;
		}
		const valError = validatePassword(pw);
		if (valError) {
			setError(valError);
			return;
		}

		setLoading(true);
		try {
			await changeOwnPassword(pw, confirm);
			dispatch({
				type: ACTION_TYPES.UPDATE_USER,
				payload: { must_change_password: false },
			});
			const defaultPath = getDefaultRouteForUser(state.user);
			navigate(defaultPath === '/login' ? '/' : defaultPath, { replace: true });
		} catch (err) {
			const detail = err?.data?.detail;
			setError(
				Array.isArray(detail) ? detail.join(' ') : detail || err?.message || 'Failed to update password.',
			);
		} finally {
			setLoading(false);
		}
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
						<Stack spacing={3} alignItems="center" sx={{ mb: 3 }}>
							<img
								src="/logo.png"
								alt="Alpha Aviation"
								style={{ height: 56, width: 56 }}
							/>
							<Typography variant="h5" sx={{ fontWeight: 700 }}>
								Set Your New Password
							</Typography>
							<Typography variant="body2" color="text.secondary" textAlign="center">
								Your administrator has reset your password. Please choose a new
								password to continue.
							</Typography>
						</Stack>

						{state.user?.username && (
							<TextField
								fullWidth
								label="Username"
								value={state.user.username}
								disabled
								sx={{ mb: 2 }}
								variant="outlined"
							/>
						)}

						{error && (
							<Alert severity="error" sx={{ mb: 2 }}>
								{error}
							</Alert>
						)}

						<form onSubmit={handleSubmit} noValidate>
							<Stack spacing={3}>
								<TextField
									fullWidth
									label="New Password"
									type={showPassword ? 'text' : 'password'}
									value={form.password}
									onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
									autoComplete="new-password"
									required
									disabled={loading}
									InputProps={{
										endAdornment: (
											<InputAdornment position="end">
												<IconButton
													onClick={() => setShowPassword((v) => !v)}
													edge="end"
													type="button"
												>
													{showPassword ? <VisibilityOff /> : <Visibility />}
												</IconButton>
											</InputAdornment>
										),
									}}
								/>

								<TextField
									fullWidth
									label="Confirm Password"
									type={showPassword ? 'text' : 'password'}
									value={form.confirm}
									onChange={(e) => setForm((s) => ({ ...s, confirm: e.target.value }))}
									autoComplete="new-password"
									required
									disabled={loading}
								/>

								<Typography variant="caption" color="text.secondary">
									Min 8 characters, 1 uppercase, 1 lowercase, 1 digit, 1 special character.
								</Typography>

								<Button
									type="submit"
									fullWidth
									variant="contained"
									size="large"
									disabled={loading}
									sx={{ py: 1.5 }}
								>
									{loading ? 'Updating…' : 'Set Password & Continue'}
								</Button>
							</Stack>
						</form>
					</CardContent>
				</Card>
			</Container>
		</Box>
	);
};

export default ChangePasswordPage;
