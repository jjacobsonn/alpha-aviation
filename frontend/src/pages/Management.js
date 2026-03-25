import React, { useEffect, useMemo, useState } from 'react';
import {
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
} from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import InventoryIcon from '@mui/icons-material/Inventory';
import BuildIcon from '@mui/icons-material/Build';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RequestPageIcon from '@mui/icons-material/RequestPage';
import {
	fetchCompanyAircrafts,
	fetchCompanyLowStockInventoriesDetailed,
	fetchCompanyWorkorders,
	fetchCompanyDiscrepancies,
} from '../shared/Api';

const Management = () => {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [aircraft, setAircraft] = useState([]);
	const [lowStockInventories, setLowStockInventories] = useState([]);
	const [workOrders, setWorkOrders] = useState([]);
	const [discrepancies, setDiscrepancies] = useState([]);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			setLoading(true);
			setError('');
			try {
				const [ac, lowStock, wo, disc] = await Promise.all([
					fetchCompanyAircrafts(),
					fetchCompanyLowStockInventoriesDetailed(),
					fetchCompanyWorkorders(),
					fetchCompanyDiscrepancies(),
				]);
				if (!mounted) return;
				setAircraft(Array.isArray(ac) ? ac : []);
				setLowStockInventories(Array.isArray(lowStock) ? lowStock : []);
				setWorkOrders(Array.isArray(wo) ? wo : []);
				setDiscrepancies(Array.isArray(disc) ? disc : []);
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
	}, []);

	const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

	const pendingTasksCount = useMemo(() => {
		const openWOs = (workOrders || []).filter((wo) => wo?.status !== 'closed').length;
		return openWOs + (discrepancies || []).length;
	}, [workOrders, discrepancies]);

	const lowStockCount = useMemo(() => (lowStockInventories || []).length, [lowStockInventories]);

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
				value: aircraft.length,
				trend: 'Live',
				icon: <FlightTakeoffIcon sx={{ fontSize: 32 }} />,
				color: '#273469',
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
		[aircraft.length, completedTodayCount, lowStockCount, pendingTasksCount]
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
			};
		});

		const discItems = (discrepancies || []).map((d) => ({
			key: `disc-${d.id}`,
			when: d?.date_reported || null,
			icon: <RequestPageIcon />,
			color: '#f32f21ff',
			title: 'New Discrepancy',
			detail: d?.description || `Discrepancy #${d.id}`,
		}));

		return [...woItems, ...discItems].sort((a, b) => {
			const aT = a.when ? new Date(a.when).getTime() : 0;
			const bT = b.when ? new Date(b.when).getTime() : 0;
			return bT - aT;
		});
	}, [discrepancies, workOrders]);

	return (
		<Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
			<Container maxWidth="xl" sx={{ py: 4 }}>
				{/* Welcome Section */}
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

				{/* Error */}
				{error && (
					<Stack sx={{ mb: 3 }}>
						<Typography variant="body2" color="error">
							{error}
						</Typography>
					</Stack>
				)}

				{/* Quick Stats */}
				<Grid container spacing={3} sx={{ mb: 5 }}>
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

				{/* Recent Activity Section */}
				<Box sx={{ mt: 5 }}>
					<Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
						Recent Activity
					</Typography>
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
											<Stack direction="row" spacing={2} alignItems="center">
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
												<Typography variant="caption" color="text.secondary">
													{it.when ? new Date(it.when).toLocaleString() : ''}
												</Typography>
											</Stack>
											{idx !== Math.min(3, recentActivity.length - 1) && <Divider />}
										</React.Fragment>
									))}
								</Stack>
							)}
						</CardContent>
					</Card>
				</Box>
			</Container>
		</Box>
	);
};

export default Management;
