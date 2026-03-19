import React, { useEffect, useMemo, useState } from 'react';
import {
	Alert,
	Box,
	Card,
	CardContent,
	Container,
	Button,
	Grid,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
	CircularProgress,
} from '@mui/material';

import BuildIcon from '@mui/icons-material/Build';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';

import AddWorkOrderForm from '../components/AddWorkOrderForm';
import AddDiscrepancyForm from '../components/AddDiscrepancyForm';
import { fetchCompanyDiscrepancies, fetchCompanyWorkorders } from '../shared/Api';


const KPICard = ({ title, color, trend }) => (
	<>
		<div className='KPIcard' style={{
			//KPI Card Styling
			backgroundColor: color,
			width: '7em',
			height: '7em',
			textAlign: 'center',
			fontWeight: "bold",
		}}>
			<p>{title}</p>
			<p>{trend}</p>
		</div>
	</>
);

const Discrepancy = ({ discrepancy_number, part_number, aircraft, description }) => (
	<>
		<div style={{
			//work order styles
			bacground: 'grey',
			display: 'flex',
		}}>
			<p style={{ padding: '2em 4em', width: '15%', border: 'solid' }}>{discrepancy_number}</p>
			<p style={{ padding: '2em 4em', width: '15%', border: 'solid' }}>{part_number}</p>
			<p style={{ padding: '2em 4em', width: '15%', border: 'solid' }}>{aircraft}</p>
			<p style={{ padding: '2em 4em', width: '55%', border: 'solid' }}>{description}</p>

		</div>
	</>
);

const WorkOrder = ({ order_number, part_number, aircraft, description, assigned_to, due_date }) => (
	<div style={{
		display: 'flex',
		flexDirection: 'column',
		gap: '0px',
		border: 'solid',
		margin: '2em'
	}}>
		<div style={{
			//work order styles
			background: 'grey',
			display: 'flex',

		}}>
			<p style={{ padding: '2em 2em', width: '20%', border: 'solid' }}>{order_number}</p>
			<p style={{ padding: '2em 2em', width: '20%', border: 'solid' }}>{part_number}</p>
			<p style={{ padding: '2em 2em', width: '20%', border: 'solid' }}>{aircraft}</p>
			<p style={{ padding: '2em 2em', width: '20%', border: 'solid' }}>assigned to: {assigned_to}</p>
			<p style={{ padding: '2em 2em', width: '20%', border: 'solid' }}>due: {due_date}</p>
		</div>
		<div>
			<p style={{ padding: '2em 2em' }}>{description}</p>
		</div>
	</div>
);

const Maintenance = () => {
	const [isAddWorkOrderOpen, setIsAddWorkOrderOpen] = useState(false);
	const [isAddDiscrepancyOpen, setIsAddDiscrepancyOpen] = useState(false);
	const [workOrders, setWorkOrders] = useState([]);
	const [discrepancies, setDiscrepancies] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let mounted = true;

		const load = async () => {
			setIsLoading(true);
			setError('');
			try {
				const [woData, discData] = await Promise.all([
					fetchCompanyWorkorders(),
					fetchCompanyDiscrepancies(),
				]);
				if (!mounted) return;
				setWorkOrders(Array.isArray(woData) ? woData : []);
				setDiscrepancies(Array.isArray(discData) ? discData : []);
			} catch (e) {
				if (!mounted) return;
				setError(e?.message || 'Failed to load maintenance data.');
			} finally {
				if (!mounted) return;
				setIsLoading(false);
			}
		};

		load();

		return () => {
			mounted = false;
		};
	}, []);

	const today = useMemo(() => new Date(), []);

	const overdueWorkOrders = useMemo(
		() =>
			workOrders.filter((wo) => {
				if (!wo.due_by) return false;
				const dueDate = new Date(wo.due_by);
				return dueDate < today;
			}),
		[workOrders, today]
	);

	const dueSoonWorkOrders = useMemo(
		() =>
			workOrders.filter((wo) => {
				if (!wo.due_by) return false;
				const dueDate = new Date(wo.due_by);
				const diffInTime = dueDate - today;
				const diffInDays = diffInTime / (1000 * 60 * 60 * 24);
				return diffInDays >= 0 && diffInDays <= 7;
			}),
		[workOrders, today]
	);

	const mappedWorkOrders = useMemo(
		() =>
			workOrders.map((wo) => ({
				id: wo.id,
				order_number: wo.id,
				part_number: (wo.parts_needed && wo.parts_needed.length) ? wo.parts_needed[0] : '',
				aircraft:
					typeof wo.aircraft === 'object'
						? wo.aircraft.model || wo.aircraft.registration_number
						: wo.aircraft,
				assigned_to: Array.isArray(wo.created_by) ? wo.created_by.join(' ') : wo.created_by,
				due_date: wo.due_by,
				description: wo.description,
			})),
		[workOrders]
	);

	const mappedDiscrepancies = useMemo(
		() =>
			discrepancies.map((d) => ({
				id: d.id,
				discrepancy_number: d.id,
				part_number: d.ata_code || '',
				aircraft: d.aircraft,
				description: d.description,
			})),
		[discrepancies]
	);
	return (
		<Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
					<Box>
						<Typography variant="h4" sx={{ fontWeight: 800 }}>
							Maintenance
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Work orders and discrepancy reports (company-scoped)
						</Typography>
					</Box>
					<Stack direction="row" spacing={1}>
						<Button
							variant="contained"
							startIcon={<BuildIcon />}
							onClick={() => setIsAddWorkOrderOpen(true)}
						>
							Add Work Order
						</Button>
						<Button
							variant="outlined"
							startIcon={<WarningIcon />}
							onClick={() => setIsAddDiscrepancyOpen(true)}
						>
							Add Discrepancy
						</Button>
					</Stack>
				</Stack>

				{error ? (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				) : null}

				{/* KPI Cards */}
				<Grid container spacing={3} sx={{ mb: 3 }}>
					<Grid item xs={12} sm={6} md={3}>
						<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
							<CardContent>
								<Stack spacing={1}>
									<Stack direction="row" spacing={2} alignItems="center">
										<Box sx={{ bgcolor: '#2196F315', color: '#2196F3', p: 1.25, borderRadius: 2 }}>
											<WorkHistoryIcon />
										</Box>
										<Box sx={{ flexGrow: 1 }}>
											<Typography variant="body2" color="text.secondary">
												Pending
											</Typography>
											<Typography variant="h4" sx={{ fontWeight: 900 }}>
												{isLoading ? '—' : discrepancies.length}
											</Typography>
										</Box>
									</Stack>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
							<CardContent>
								<Stack spacing={1}>
									<Stack direction="row" spacing={2} alignItems="center">
										<Box sx={{ bgcolor: '#FF980015', color: '#FF9800', p: 1.25, borderRadius: 2 }}>
											<BuildIcon />
										</Box>
										<Box sx={{ flexGrow: 1 }}>
											<Typography variant="body2" color="text.secondary">
												Open
											</Typography>
											<Typography variant="h4" sx={{ fontWeight: 900 }}>
												{isLoading ? '—' : workOrders.length}
											</Typography>
										</Box>
									</Stack>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
							<CardContent>
								<Stack spacing={1}>
									<Stack direction="row" spacing={2} alignItems="center">
										<Box sx={{ bgcolor: '#F4433615', color: '#F44336', p: 1.25, borderRadius: 2 }}>
											<WarningIcon />
										</Box>
										<Box sx={{ flexGrow: 1 }}>
											<Typography variant="body2" color="text.secondary">
												Overdue
											</Typography>
											<Typography variant="h4" sx={{ fontWeight: 900 }}>
												{isLoading ? '—' : overdueWorkOrders.length}
											</Typography>
										</Box>
									</Stack>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
							<CardContent>
								<Stack spacing={1}>
									<Stack direction="row" spacing={2} alignItems="center">
										<Box sx={{ bgcolor: '#4CAF5015', color: '#4CAF50', p: 1.25, borderRadius: 2 }}>
											<CheckCircleIcon />
										</Box>
										<Box sx={{ flexGrow: 1 }}>
											<Typography variant="body2" color="text.secondary">
												Due Soon
											</Typography>
											<Typography variant="h4" sx={{ fontWeight: 900 }}>
												{isLoading ? '—' : dueSoonWorkOrders.length}
											</Typography>
										</Box>
									</Stack>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Tables */}
				<Grid container spacing={3}>
					<Grid item xs={12} lg={7}>
						<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
							<CardContent sx={{ p: 3 }}>
								<Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
									Work Orders
								</Typography>

								{isLoading ? (
									<Stack alignItems="center" sx={{ py: 4 }}>
										<CircularProgress />
									</Stack>
								) : (
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>ID</TableCell>
												<TableCell>Part</TableCell>
												<TableCell>Aircraft</TableCell>
												<TableCell>Assigned</TableCell>
												<TableCell>Due</TableCell>
												<TableCell>Description</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{mappedWorkOrders.map((order) => (
												<TableRow key={order.id}>
													<TableCell>{order.order_number}</TableCell>
													<TableCell>{order.part_number || '—'}</TableCell>
													<TableCell>{order.aircraft || '—'}</TableCell>
													<TableCell>{order.assigned_to || '—'}</TableCell>
													<TableCell>{order.due_date || '—'}</TableCell>
													<TableCell>{order.description || '—'}</TableCell>
												</TableRow>
											))}
											{mappedWorkOrders.length === 0 ? (
												<TableRow>
													<TableCell colSpan={6} sx={{ color: 'text.secondary' }}>
														No work orders found.
													</TableCell>
												</TableRow>
											) : null}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</Grid>

					<Grid item xs={12} lg={5}>
						<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
							<CardContent sx={{ p: 3 }}>
								<Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
									Discrepancies (Pending)
								</Typography>

								{isLoading ? (
									<Stack alignItems="center" sx={{ py: 4 }}>
										<CircularProgress />
									</Stack>
								) : (
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>ID</TableCell>
												<TableCell>ATA</TableCell>
												<TableCell>Aircraft</TableCell>
												<TableCell>Description</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{mappedDiscrepancies.map((d) => (
												<TableRow key={d.id}>
													<TableCell>{d.discrepancy_number}</TableCell>
													<TableCell>{d.part_number || '—'}</TableCell>
													<TableCell>{d.aircraft || '—'}</TableCell>
													<TableCell>{d.description || '—'}</TableCell>
												</TableRow>
											))}
											{mappedDiscrepancies.length === 0 ? (
												<TableRow>
													<TableCell colSpan={4} sx={{ color: 'text.secondary' }}>
														No discrepancies found.
													</TableCell>
												</TableRow>
											) : null}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Modals */}
				<AddWorkOrderForm
					isOpen={isAddWorkOrderOpen}
					onClose={() => setIsAddWorkOrderOpen(false)}
				/>
				<AddDiscrepancyForm
					isOpen={isAddDiscrepancyOpen}
					onClose={() => setIsAddDiscrepancyOpen(false)}
				/>
			</Container>
		</Box>
	);
}
export default Maintenance;
