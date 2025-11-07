// import { useState } from 'react';
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

const Management = () => {
	const quickStats = [
		{
			label: 'Active Aircraft',
			value: '48',
			trend: '+3',
			icon: <FlightTakeoffIcon sx={{ fontSize: 32 }} />,
			color: '#273469',
		},
		{
			label: 'Pending Tasks',
			value: '12',
			trend: '-2',
			icon: <BuildIcon sx={{ fontSize: 32 }} />,
			color: '#FF9800',
		},
		{
			label: 'Low Stock Items',
			value: '5',
			trend: 'Urgent',
			icon: <WarningIcon sx={{ fontSize: 32 }} />,
			color: '#F44336',
		},
		{
			label: 'Completed Today',
			value: '24',
			trend: '+8',
			icon: <CheckCircleIcon sx={{ fontSize: 32 }} />,
			color: '#4CAF50',
		},
	];

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
												{stat.value}
											</Typography>
											<Chip
												label={stat.trend}
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
							<Stack spacing={2.5}>
								<Stack direction="row" spacing={2} alignItems="center">
									<Avatar sx={{ bgcolor: '#4CAF50' }}>
										<CheckCircleIcon />
									</Avatar>
									<Box sx={{ flexGrow: 1 }}>
										<Typography variant="body1" sx={{ fontWeight: 600 }}>
											Maintenance Task Completed
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Aircraft N12345 - 100hr inspection completed by Tech #342
										</Typography>
									</Box>
									<Typography variant="caption" color="text.secondary">
										2 hours ago
									</Typography>
								</Stack>

								<Divider />

								<Stack direction="row" spacing={2} alignItems="center">
									<Avatar sx={{ bgcolor: '#2196F3' }}>
										<InventoryIcon />
									</Avatar>
									<Box sx={{ flexGrow: 1 }}>
										<Typography variant="body1" sx={{ fontWeight: 600 }}>
											New Parts Received
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Shipment #7821 - 45 parts added to inventory
										</Typography>
									</Box>
									<Typography variant="caption" color="text.secondary">
										5 hours ago
									</Typography>
								</Stack>

								<Divider />

								<Stack direction="row" spacing={2} alignItems="center">
									<Avatar sx={{ bgcolor: '#FF9800' }}>
										<BuildIcon />
									</Avatar>
									<Box sx={{ flexGrow: 1 }}>
										<Typography variant="body1" sx={{ fontWeight: 600 }}>
											New Work Order Created
										</Typography>
										<Typography variant="body2" color="text.secondary">
											WO-2025-0124 - Emergency repair scheduled for N67890
										</Typography>
									</Box>
									<Typography variant="caption" color="text.secondary">
										1 day ago
									</Typography>
								</Stack>

								<Divider />

								<Stack direction="row" spacing={2} alignItems="center">
									<Avatar sx={{ bgcolor: '#f32f21ff' }}>
										<RequestPageIcon />
									</Avatar>
									<Box sx={{ flexGrow: 1 }}>
										<Typography variant="body1" sx={{ fontWeight: 600 }}>
											Requests
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Shipment #7821 - 45 parts added to inventory
										</Typography>
									</Box>
									<Typography variant="caption" color="text.secondary">
										5 hours ago
									</Typography>
								</Stack>
							</Stack>
						</CardContent>
					</Card>
				</Box>
			</Container>
		</Box>
	);
};

export default Management;
