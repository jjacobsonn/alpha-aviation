import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme } from '@mui/material/styles';
import { makeApiRequest } from '../shared/Api';

export default function AircraftUptimeDowntimeGraph() {
	const theme = useTheme();
	const [chartDataset, setChartDataset] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		makeApiRequest('GET', '/management/dashboard/')
			.then((response) => {
				const rawData = response.aircraft_analytics?.uptime_downtime || {};

				const formattedData = Object.entries(rawData).map(([aircraftId, metrics]) => {
					const totalHours = metrics.total_time_hours || 0;
					const downHours = metrics.down_time_hours || 0;

					let downtimePercent = 0;
					let uptimePercent = 100;

					if (totalHours > 0) {
						downtimePercent = Math.round((downHours / totalHours) * 100);
						uptimePercent = 100 - downtimePercent;
					}

					return {
						aircraftType: aircraftId,
						uptime: uptimePercent,
						downtime: downtimePercent,
						tooltipText: `Uptime: ${uptimePercent}% | Downtime: ${downtimePercent}%`,
					};
				});

				setChartDataset(formattedData);
				setLoading(false);
			})
			.catch((error) => {
				console.error('Error fetching uptime/downtime telemetry data:', error);
				setLoading(false);
			});
	}, []);

	if (loading) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
				<CircularProgress color="primary" />
			</Box>
		);
	}

	return (
		<Card
			elevation={0}
			sx={{
				border: '1px solid',
				borderColor: 'divider',
				width: '100%',
			}}
		>
			<CardContent sx={{ p: { xs: 2, sm: 3 } }}>
				<Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.6 }}>
					Uptime vs downtime
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Operational availability vs maintenance downtime by aircraft
				</Typography>

				{chartDataset.length === 0 ? (
					<Typography align="center" sx={{ py: 4 }} color="text.secondary">
						No airplane uptime metrics available.
					</Typography>
				) : (
					<Box sx={{ width: '100%', minWidth: 0 }}>
						<BarChart
							dataset={chartDataset}
							layout="horizontal"
							yAxis={[
								{
									scaleType: 'band',
									dataKey: 'aircraftType',
									label: 'Aircraft',
									tickLabelStyle: { fontWeight: 600, fontSize: 12 },
								},
							]}
							xAxis={[
								{
									max: 100,
									label: 'Percent of time',
									valueFormatter: (value) => `${value}%`,
									tickLabelStyle: { fontSize: 12 },
								},
							]}
							series={[
								{
									dataKey: 'uptime',
									label: 'Uptime',
									stack: 'availability',
									color: theme.palette.success.main,
									borderRadius: 4,
								},
								{
									dataKey: 'downtime',
									label: 'Downtime',
									stack: 'availability',
									color: theme.palette.error.main,
									borderRadius: 4,
								},
							]}
							height={Math.max(280, chartDataset.length * 36)}
							margin={{ left: 88, right: 24, top: 16, bottom: 48 }}
							slotProps={{
								legend: {
									direction: 'row',
									position: { vertical: 'bottom', horizontal: 'left' },
									padding: 0,
									labelStyle: { fontSize: 12 },
								},
							}}
							grid={{ horizontal: true, vertical: false }}
						/>
					</Box>
				)}
			</CardContent>
		</Card>
	);
}
