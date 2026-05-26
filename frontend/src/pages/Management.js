import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import {
	Alert,
	Box,
	Container,
	Grid,
	Card,
	CardContent,
	Avatar,
	Divider,
	Stack,
	Chip,
	Typography,
	Button,
	IconButton,
	InputAdornment,
	MenuItem,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Snackbar,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Link,
	TextField,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockResetIcon from '@mui/icons-material/LockReset';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import BuildIcon from '@mui/icons-material/Build';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RequestPageIcon from '@mui/icons-material/RequestPage';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import {
	fetchCompanyWorkorders,
	fetchCompanyDiscrepancies,
	fetchCompanyUsers,
	fetchManagementDashboard,
	fetchFleetAvailabilityDashboard,
	fetchCompanyAircrafts,
	createProfile,
	updateProfile,
	adminResetPassword,
} from '../shared/Api';
import { useAppContext } from '../context/AppContext';
import { isPlatformAdmin } from '../shared/rbac';
import FleetAvailabilityPanel from '../components/management/FleetAvailabilityPanel';
import FleetStatusPanel from '../components/management/FleetStatusPanel';

const ROLE_LABELS = {
	owner: 'Owner',
	manager: 'Manager',
	mechanic: 'Mechanic',
	pilot: 'Pilot',
	dispatcher: 'Dispatcher',
};

function maintenanceLinkForActivity(item) {
	if (item.entityType === 'workorder') {
		return `/maintenance?wo=${item.entityId}`;
	}
	if (item.entityType === 'discrepancy') {
		return `/maintenance?disc=${item.entityId}`;
	}
	return '/maintenance';
}

function maintenanceActionForActivity(item) {
	if (item.entityType === 'workorder') {
		if (!item.assignedToId) return 'Assign';
		if (item.status === 'open') return 'Start';
		if (item.status === 'in_progress') return 'Review';
		if (item.status === 'awaiting_parts') return 'Review parts';
		if (item.status === 'closed') return 'View';
	}
	if (item.entityType === 'discrepancy') {
		if (item.status === 'pending') return 'Triage';
		return 'View';
	}
	return 'Open';
}

const Management = () => {
	const navigate = useNavigate();
	const { state } = useAppContext();
	const platformAdmin = isPlatformAdmin(state.user);
	const hasCompanyContext = Boolean(state.user?.companyId) || Boolean(localStorage.getItem('adminCompanyId'));
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [dashboard, setDashboard] = useState(null);
	const [fleetAvailability, setFleetAvailability] = useState(null);
	const [companyAircraft, setCompanyAircraft] = useState([]);
	const [workOrders, setWorkOrders] = useState([]);
	const [discrepancies, setDiscrepancies] = useState([]);
	const [companyUsers, setCompanyUsers] = useState([]);
	const [editUserOpen, setEditUserOpen] = useState(false);
	const [createUserOpen, setCreateUserOpen] = useState(false);
	const [editingUserId, setEditingUserId] = useState(null);
	const [editingUserForm, setEditingUserForm] = useState({
		first_name: '',
		last_name: '',
		email: '',
		phone_number: '',
		company_role: '',
	});
	const [savingUser, setSavingUser] = useState(false);
	const [creatingUser, setCreatingUser] = useState(false);
	const [newUserForm, setNewUserForm] = useState({
		username: '',
		password: '',
		first_name: '',
		last_name: '',
		email: '',
		phone_number: '',
		company_role: 'pilot',
	});
	const [resetPwUser, setResetPwUser] = useState(null);
	const [resetPwForm, setResetPwForm] = useState({ password: '', confirm: '' });
	const [resetPwError, setResetPwError] = useState('');
	const [resetPwLoading, setResetPwLoading] = useState(false);
	const [resetPwShowPassword, setResetPwShowPassword] = useState(false);
	const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			if (platformAdmin && !hasCompanyContext) {
				setLoading(false);
				return;
			}
			setLoading(true);
			setError('');
			try {
				const [dash, wo, disc, users, fleetAvail, acList] = await Promise.all([
					fetchManagementDashboard(),
					fetchCompanyWorkorders(),
					fetchCompanyDiscrepancies(),
					fetchCompanyUsers(),
					(async () => {
						try {
							return await fetchFleetAvailabilityDashboard();
						} catch {
							return null;
						}
					})(),
					(async () => {
						try {
							const raw = await fetchCompanyAircrafts();
							return Array.isArray(raw) ? raw : [];
						} catch {
							return [];
						}
					})(),
				]);
				if (!mounted) return;
				setDashboard(dash && typeof dash === 'object' ? dash : null);
				setFleetAvailability(fleetAvail && typeof fleetAvail === 'object' ? fleetAvail : null);
				setCompanyAircraft(acList);
				setWorkOrders(Array.isArray(wo) ? wo : []);
				setDiscrepancies(Array.isArray(disc) ? disc : []);
				setCompanyUsers(Array.isArray(users) ? users : []);
			} catch (e) {
				if (!mounted) return;
				setError(e?.message || 'Failed to load management dashboard.');
			} finally {
				if (!mounted) return;
				setLoading(false);
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, [platformAdmin, hasCompanyContext]);

	const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

	const counts = dashboard?.counts;

	const openWoByAircraft = useMemo(() => {
		const m = {};
		for (const wo of workOrders || []) {
			if (wo?.status === 'closed') continue;
			const ac = wo?.aircraft;
			const id =
				typeof ac === 'object' && ac != null && ac.id != null
					? Number(ac.id)
					: ac != null && ac !== ''
						? Number(ac)
						: null;
			if (id == null || Number.isNaN(id)) continue;
			m[id] = (m[id] || 0) + 1;
		}
		return m;
	}, [workOrders]);

	const pendingTasksCount = useMemo(() => {
		if (counts) {
			return (counts.work_orders_open || 0) + (counts.discrepancies_pending || 0);
		}
		const openWOs = (workOrders || []).filter((wo) => wo?.status !== 'closed').length;
		const pendingDisc = (discrepancies || []).filter((d) => d?.status === 'pending').length;
		return openWOs + pendingDisc;
	}, [counts, workOrders, discrepancies]);

	const lowStockCount = useMemo(() => counts?.low_stock_items ?? 0, [counts]);

	const completedTodayCount = useMemo(() => {
		return (workOrders || []).filter((wo) => {
			if (wo?.status !== 'closed') return false;
			const updated = wo?.updated_at ? String(wo.updated_at).slice(0, 10) : '';
			const created = wo?.created_at ? String(wo.created_at).slice(0, 10) : '';
			return updated === todayKey || created === todayKey;
		}).length;
	}, [workOrders, todayKey]);

	const quickStats = useMemo(
		() => [
			{
				label: 'Active Aircraft',
				value: counts?.aircraft ?? '—',
				trend: 'Live',
				icon: <FlightTakeoffIcon sx={{ fontSize: 32 }} />,
				color: '#2B7FD4',
			},
			{
				label: 'Pending Tasks',
				value: pendingTasksCount,
				trend: 'Open',
				icon: <BuildIcon sx={{ fontSize: 32 }} />,
				color: '#FF9800',
			},
			{
				label: 'Low Stock Items',
				value: lowStockCount,
				trend: lowStockCount > 0 ? 'Urgent' : 'OK',
				icon: <WarningIcon sx={{ fontSize: 32 }} />,
				color: '#F44336',
			},
			{
				label: 'Completed Today',
				value: completedTodayCount,
				trend: completedTodayCount > 0 ? '+ done' : '—',
				icon: <CheckCircleIcon sx={{ fontSize: 32 }} />,
				color: '#4CAF50',
			},
		],
		[counts?.aircraft, completedTodayCount, lowStockCount, pendingTasksCount]
	);

	const recentActivity = useMemo(() => {
		const woItems = (workOrders || []).map((wo) => {
			const when = wo?.updated_at || wo?.created_at || null;
			return {
				key: `wo-${wo.id}`,
				when,
				icon: wo?.status === 'closed' ? <CheckCircleIcon /> : <BuildIcon />,
				color: wo?.status === 'closed' ? '#4CAF50' : '#FF9800',
				title: wo?.status === 'closed' ? 'Work Order Completed' : 'Work Order Updated',
				detail: wo?.title || `Work Order #${wo.id}`,
				entityType: 'workorder',
				entityId: wo?.id,
				status: wo?.status,
				assignedToId:
					typeof wo?.created_by === 'object' && wo?.created_by != null
						? wo.created_by.id
						: wo?.created_by ?? null,
			};
		});

		const discItems = (discrepancies || []).map((d) => ({
			key: `disc-${d.id}`,
			when: d?.date_reported || null,
			icon: <RequestPageIcon />,
			color: '#f32f21ff',
			title: 'New Discrepancy',
			detail: d?.description || `Discrepancy #${d.id}`,
			entityType: 'discrepancy',
			entityId: d?.id,
			status: d?.status,
		}));

		return [...woItems, ...discItems].sort((a, b) => {
			const aT = a.when ? new Date(a.when).getTime() : 0;
			const bT = b.when ? new Date(b.when).getTime() : 0;
			return bT - aT;
		});
	}, [discrepancies, workOrders]);

	const teamByRole = dashboard?.team_by_role || {};
	const sortedUsers = useMemo(() => {
		const list = [...(companyUsers || [])];
		list.sort((a, b) => {
			const r = String(a.company_role || '').localeCompare(String(b.company_role || ''));
			if (r !== 0) return r;
			return String(a.last_name || '').localeCompare(String(b.last_name || ''));
		});
		return list;
	}, [companyUsers]);
	const canEditRoster = platformAdmin || state.user?.role === 'owner';

	const openEditUser = (u) => {
		setEditingUserId(u.id);
		setResetPwUser(u);
		setEditingUserForm({
			first_name: u.first_name || '',
			last_name: u.last_name || '',
			email: u.email || '',
			phone_number: u.phone_number || '',
			company_role: u.company_role || '',
		});
		setResetPwForm({ password: '', confirm: '' });
		setResetPwError('');
		setResetPwShowPassword(false);
		setEditUserOpen(true);
	};

	const closeEditUser = () => {
		setEditUserOpen(false);
		setEditingUserId(null);
	};

	const openCreateUser = () => {
		setNewUserForm({
			username: '',
			password: '',
			first_name: '',
			last_name: '',
			email: '',
			phone_number: '',
			company_role: 'pilot',
		});
		setCreateUserOpen(true);
	};

	const closeCreateUser = () => {
		setCreateUserOpen(false);
	};

	const saveEditedUser = async () => {
		if (!editingUserId) return;
		setSavingUser(true);
		setError('');
		try {
			await updateProfile(editingUserId, editingUserForm);
			const users = await fetchCompanyUsers();
			setCompanyUsers(Array.isArray(users) ? users : []);
			closeEditUser();
		} catch (e) {
			setError(e?.message || 'Failed to update user.');
		} finally {
			setSavingUser(false);
		}
	};

	const createUser = async () => {
		if (!newUserForm.username.trim() || !newUserForm.password) {
			setError('Username and password are required to create a user.');
			return;
		}
		setCreatingUser(true);
		setError('');
		try {
			await createProfile({
				...newUserForm,
				username: newUserForm.username.trim(),
			});
			const users = await fetchCompanyUsers();
			setCompanyUsers(Array.isArray(users) ? users : []);
			closeCreateUser();
		} catch (e) {
			setError(e?.message || 'Failed to create user.');
		} finally {
			setCreatingUser(false);
		}
	};

	const validatePassword = (pw) => {
		if (pw.length < 8) return 'Password must be at least 8 characters.';
		if (!/[A-Z]/.test(pw)) return 'Must contain at least one uppercase letter.';
		if (!/[a-z]/.test(pw)) return 'Must contain at least one lowercase letter.';
		if (!/\d/.test(pw)) return 'Must contain at least one digit.';
		if (!/[!@#$%^&*()_+\-=[\]{}|;:',.<>?/`~]/.test(pw))
			return 'Must contain at least one special character.';
		return null;
	};

	const submitResetPw = async () => {
		setResetPwError('');
		const pw = resetPwForm.password.trim();
		const confirm = resetPwForm.confirm.trim();
		if (!pw || !confirm) {
			setResetPwError('Both fields are required.');
			return;
		}
		if (pw !== confirm) {
			setResetPwError('Passwords do not match.');
			return;
		}
		const valError = validatePassword(pw);
		if (valError) {
			setResetPwError(valError);
			return;
		}
		setResetPwLoading(true);
		try {
			await adminResetPassword(resetPwUser.id, pw);
			setSnackbar({
				open: true,
				message: `Password reset for ${resetPwUser.first_name || resetPwUser.username}. They will be prompted to set a new password on next login.`,
				severity: 'success',
			});
			setResetPwForm({ password: '', confirm: '' });
			setResetPwError('');
		} catch (e) {
			const detail = e?.data?.detail;
			setResetPwError(
				Array.isArray(detail) ? detail.join(' ') : detail || e?.message || 'Failed to reset password.',
			);
		} finally {
			setResetPwLoading(false);
		}
	};

	const companyBlock = dashboard?.company;
	const displayCompanyName =
		companyBlock?.name || state.user?.companyName || 'Your company';

	return (
		<Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
			<Container maxWidth="xl" sx={{ py: 4 }}>
				{platformAdmin && !hasCompanyContext && (
					<Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
						<Typography variant="body2" color="text.secondary">
							Select a company from{' '}
							<Link component={RouterLink} to="/admin/companies" underline="hover">
								Organizations
							</Link>{' '}
							to load this dashboard for that company.
						</Typography>
					</Box>
				)}

				<Box sx={{ mb: 4 }}>
					<Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
						Welcome Back
					</Typography>
					<Typography variant="body1" color="text.secondary">
						{new Date().toLocaleDateString('en-US', {
							weekday: 'long',
							year: 'numeric',
							month: 'long',
							day: 'numeric',
						})}
					</Typography>
				</Box>

				{companyBlock && !loading && (
					<Card
						elevation={0}
						sx={{
							mb: 4,
							border: '1px solid',
							borderColor: 'divider',
							background: 'linear-gradient(135deg, #2B7FD408 0%, #ffffff 100%)',
						}}
					>
						<CardContent sx={{ p: 3 }}>
							<Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
								<Stack direction="row" spacing={2} alignItems="center">
									<Box
										sx={{
											bgcolor: '#2B7FD415',
											color: '#2B7FD4',
											p: 1.5,
											borderRadius: 2,
											display: 'flex',
										}}
									>
										<BusinessOutlinedIcon sx={{ fontSize: 40 }} />
									</Box>
									<Box>
										<Typography variant="overline" color="text.secondary">
											Your organization
										</Typography>
										<Typography variant="h5" sx={{ fontWeight: 800 }}>
											{displayCompanyName}
										</Typography>
										{companyBlock.locations ? (
											<Typography variant="body2" color="text.secondary">
												{companyBlock.locations}
											</Typography>
										) : null}
										<Typography variant="caption" color="text.secondary">
											Company ID {companyBlock.id}
										</Typography>
									</Box>
								</Stack>
								<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
									<Button
										variant="contained"
										component={RouterLink}
										to="/parts"
										startIcon={<Inventory2OutlinedIcon />}
										sx={{ bgcolor: '#2B7FD4', '&:hover': { bgcolor: '#1f5fa8' } }}
									>
										Inventory & parts
									</Button>
									<Button variant="outlined" component={RouterLink} to="/admin/companies/current">
										Organization overview
									</Button>
								</Stack>
							</Stack>
						</CardContent>
					</Card>
				)}

				<Grid container spacing={3} sx={{ mb: 4 }}>
					{quickStats.map((stat, index) => (
						<Grid item xs={12} sm={6} md={3} key={index}>
							<Card
								elevation={0}
								sx={{
									p: 2,
									border: '1px solid',
									borderColor: 'divider',
									height: '100%',
								}}
							>
								<Stack direction="row" spacing={2} alignItems="center">
									<Box
										sx={{
											bgcolor: `${stat.color}15`,
											color: stat.color,
											p: 1.5,
											borderRadius: 2,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
										}}
									>
										{stat.icon}
									</Box>
									<Box sx={{ flexGrow: 1 }}>
										<Typography variant="body2" color="text.secondary">
											{stat.label}
										</Typography>
										<Stack direction="row" spacing={1} alignItems="baseline">
											<Typography variant="h4" sx={{ fontWeight: 700 }}>
												{loading ? '—' : stat.value}
											</Typography>
											<Chip
												label={loading ? '...' : stat.trend}
												size="small"
												sx={{
													height: 20,
													fontSize: '0.7rem',
													bgcolor:
														stat.trend.includes('+') || stat.trend === 'Urgent'
															? '#4CAF5020'
															: '#F4433620',
													color:
														stat.trend.includes('+') || stat.trend === 'Urgent'
															? '#4CAF50'
															: '#F44336',
												}}
											/>
										</Stack>
									</Box>
								</Stack>
							</Card>
						</Grid>
					))}
				</Grid>

				{hasCompanyContext && !loading ? (
					<FleetStatusPanel
						aircraft={companyAircraft}
						openWoByAircraft={openWoByAircraft}
						loading={false}
					/>
				) : hasCompanyContext && loading ? (
					<FleetStatusPanel aircraft={[]} openWoByAircraft={{}} loading />
				) : null}

				{hasCompanyContext && !loading ? (
					<FleetAvailabilityPanel data={fleetAvailability} loading={false} />
				) : hasCompanyContext && loading ? (
					<FleetAvailabilityPanel data={null} loading />
				) : null}

				{/* Error */}
				{error && (
					<Stack sx={{ mb: 3 }}>
						<Typography variant="body2" color="error">
							{error}
						</Typography>
					</Stack>
				)}

				{!loading && teamByRole && Object.keys(teamByRole).length > 0 && (
					<Box sx={{ mb: 4 }}>
						<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
							<GroupsOutlinedIcon color="primary" />
							<Typography variant="h6" sx={{ fontWeight: 600 }}>
								Team by role
							</Typography>
						</Stack>
						<Stack direction="row" flexWrap="wrap" gap={1}>
							{Object.entries(teamByRole)
								.filter(([, n]) => n > 0)
								.sort((a, b) => a[0].localeCompare(b[0]))
								.map(([role, n]) => (
									<Chip
										key={role}
										label={`${ROLE_LABELS[role] || role}: ${n}`}
										variant="outlined"
										sx={{ fontWeight: 600 }}
									/>
								))}
						</Stack>
					</Box>
				)}

				{/* Roster */}
				<Box sx={{ mb: 5 }}>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Typography variant="h6" sx={{ fontWeight: 600 }}>
							Company roster
						</Typography>
						{canEditRoster ? (
							<Button size="small" variant="contained" onClick={openCreateUser}>
								Add User
							</Button>
						) : null}
					</Stack>
					<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
						<CardContent sx={{ p: 0 }}>
							{loading ? (
								<Typography sx={{ p: 3 }} color="text.secondary">
									Loading…
								</Typography>
							) : sortedUsers.length === 0 ? (
								<Typography sx={{ p: 3 }} color="text.secondary">
									No users in this company yet.
								</Typography>
							) : (
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Name</TableCell>
											<TableCell>Username</TableCell>
											<TableCell>Role</TableCell>
											<TableCell>Email</TableCell>
											{canEditRoster ? <TableCell>Actions</TableCell> : null}
										</TableRow>
									</TableHead>
									<TableBody>
										{sortedUsers.map((u) => (
											<TableRow key={u.id}>
												<TableCell>
													{[u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ') || '—'}
												</TableCell>
												<TableCell>{u.username}</TableCell>
												<TableCell>
													<Chip size="small" label={ROLE_LABELS[u.company_role] || u.company_role || '—'} />
												</TableCell>
												<TableCell>{u.email || '—'}</TableCell>
											{canEditRoster ? (
												<TableCell>
													<Button size="small" variant="outlined" onClick={() => openEditUser(u)}>
														Edit
													</Button>
												</TableCell>
											) : null}
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</Box>

				{/* Recent Activity Section */}
				<Box sx={{ mt: 2 }}>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
						<Typography variant="h5" sx={{ fontWeight: 600 }}>
							Recent Activity
						</Typography>
						<Button component={RouterLink} to="/work-orders" variant="text" size="small">
							View all
						</Button>
					</Stack>
					<Card
						elevation={0}
						sx={{
							border: '1px solid',
							borderColor: 'divider',
						}}
					>
						<CardContent sx={{ p: 3 }}>
							{loading ? (
								<Typography color="text.secondary">Loading…</Typography>
							) : recentActivity.length === 0 ? (
								<Typography color="text.secondary">
									No recent maintenance events yet.
								</Typography>
							) : (
								<Stack spacing={2.5}>
									{recentActivity.slice(0, 4).map((it, idx) => (
										<React.Fragment key={it.key}>
											<Stack
												direction="row"
												spacing={2}
												alignItems="center"
												onClick={(e) => {
													if (e.target.closest('a')) return;
													navigate(maintenanceLinkForActivity(it));
												}}
												sx={{ cursor: 'pointer' }}
											>
												<Avatar sx={{ bgcolor: it.color }}>
													{it.icon}
												</Avatar>
												<Box sx={{ flexGrow: 1 }}>
													<Typography variant="body1" sx={{ fontWeight: 600 }}>
														{it.title}
													</Typography>
													<Typography variant="body2" color="text.secondary">
														{it.detail}
													</Typography>
												</Box>
												<Stack alignItems="flex-end" spacing={0.5}>
													<Typography variant="caption" color="text.secondary">
														{it.when ? new Date(it.when).toLocaleString() : ''}
													</Typography>
													<Button
														size="small"
														variant="outlined"
														component={RouterLink}
														to={maintenanceLinkForActivity(it)}
													>
														{maintenanceActionForActivity(it)}
													</Button>
												</Stack>
											</Stack>
											{idx !== Math.min(3, recentActivity.length - 1) && <Divider />}
										</React.Fragment>
									))}
								</Stack>
							)}
						</CardContent>
					</Card>
				</Box>
					<Dialog open={editUserOpen} onClose={closeEditUser} fullWidth maxWidth="sm">
					<DialogTitle>Edit user</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<TextField
								label="First name"
								value={editingUserForm.first_name}
								onChange={(e) => setEditingUserForm((s) => ({ ...s, first_name: e.target.value }))}
							/>
							<TextField
								label="Last name"
								value={editingUserForm.last_name}
								onChange={(e) => setEditingUserForm((s) => ({ ...s, last_name: e.target.value }))}
							/>
							<TextField
								label="Email"
								value={editingUserForm.email}
								onChange={(e) => setEditingUserForm((s) => ({ ...s, email: e.target.value }))}
							/>
							<TextField
								label="Phone number"
								value={editingUserForm.phone_number}
								onChange={(e) => setEditingUserForm((s) => ({ ...s, phone_number: e.target.value }))}
							/>
							<TextField
								select
								label="Role"
								value={editingUserForm.company_role}
								onChange={(e) => setEditingUserForm((s) => ({ ...s, company_role: e.target.value }))}
							>
								{Object.entries(ROLE_LABELS).map(([value, label]) => (
									<MenuItem key={value} value={value}>{label}</MenuItem>
								))}
							</TextField>
						</Stack>

						<Divider sx={{ my: 3 }} />

						<Stack spacing={2}>
							<Stack direction="row" spacing={1} alignItems="center">
								<LockResetIcon color="warning" fontSize="small" />
								<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
									Reset Password
								</Typography>
							</Stack>
							<Typography variant="body2" color="text.secondary">
								Set a temporary password. The user will be required to choose their own on next login.
							</Typography>
							{resetPwError && <Alert severity="error">{resetPwError}</Alert>}
							<TextField
								label="New password"
								type={resetPwShowPassword ? 'text' : 'password'}
								value={resetPwForm.password}
								onChange={(e) => setResetPwForm((s) => ({ ...s, password: e.target.value }))}
								autoComplete="new-password"
								size="small"
								InputProps={{
									endAdornment: (
										<InputAdornment position="end">
											<IconButton
												onClick={() => setResetPwShowPassword((v) => !v)}
												edge="end"
												size="small"
											>
												{resetPwShowPassword ? <VisibilityOff /> : <Visibility />}
											</IconButton>
										</InputAdornment>
									),
								}}
							/>
							<TextField
								label="Confirm password"
								type={resetPwShowPassword ? 'text' : 'password'}
								value={resetPwForm.confirm}
								onChange={(e) => setResetPwForm((s) => ({ ...s, confirm: e.target.value }))}
								autoComplete="new-password"
								size="small"
							/>
							<Typography variant="caption" color="text.secondary">
								Min 8 characters, 1 uppercase, 1 lowercase, 1 digit, 1 special character.
							</Typography>
							<Box>
								<Button
									variant="outlined"
									color="warning"
									startIcon={<LockResetIcon />}
									onClick={submitResetPw}
									disabled={resetPwLoading || !resetPwForm.password}
									size="small"
								>
									{resetPwLoading ? 'Resetting…' : 'Reset Password'}
								</Button>
							</Box>
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={closeEditUser}>Cancel</Button>
						<Button variant="contained" onClick={saveEditedUser} disabled={savingUser}>
							Save
						</Button>
					</DialogActions>
				</Dialog>
				<Dialog open={createUserOpen} onClose={closeCreateUser} fullWidth maxWidth="sm">
					<DialogTitle>Create user</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<TextField
								label="Username"
								value={newUserForm.username}
								onChange={(e) => setNewUserForm((s) => ({ ...s, username: e.target.value }))}
							/>
							<TextField
								label="Temporary password"
								type="password"
								value={newUserForm.password}
								onChange={(e) => setNewUserForm((s) => ({ ...s, password: e.target.value }))}
							/>
							<TextField
								label="First name"
								value={newUserForm.first_name}
								onChange={(e) => setNewUserForm((s) => ({ ...s, first_name: e.target.value }))}
							/>
							<TextField
								label="Last name"
								value={newUserForm.last_name}
								onChange={(e) => setNewUserForm((s) => ({ ...s, last_name: e.target.value }))}
							/>
							<TextField
								label="Email"
								value={newUserForm.email}
								onChange={(e) => setNewUserForm((s) => ({ ...s, email: e.target.value }))}
							/>
							<TextField
								label="Phone number"
								value={newUserForm.phone_number}
								onChange={(e) => setNewUserForm((s) => ({ ...s, phone_number: e.target.value }))}
							/>
							<TextField
								select
								label="Role"
								value={newUserForm.company_role}
								onChange={(e) => setNewUserForm((s) => ({ ...s, company_role: e.target.value }))}
							>
								{Object.entries(ROLE_LABELS).map(([value, label]) => (
									<MenuItem key={value} value={value}>{label}</MenuItem>
								))}
							</TextField>
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={closeCreateUser}>Cancel</Button>
						<Button variant="contained" onClick={createUser} disabled={creatingUser}>
							Create
						</Button>
					</DialogActions>
				</Dialog>
				<Snackbar
					open={snackbar.open}
					autoHideDuration={6000}
					onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
				>
					<Alert
						onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
						severity={snackbar.severity}
						variant="filled"
						sx={{ width: '100%' }}
					>
						{snackbar.message}
					</Alert>
				</Snackbar>
			</Container>
		</Box>
	);
};

export default Management;
