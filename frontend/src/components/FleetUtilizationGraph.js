import React, { useState, useEffect, useMemo } from 'react';
import { Box, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { useTheme } from '@mui/material/styles';
import { makeApiRequest } from '../shared/Api';

function chartPalette(theme) {
	return [
		theme.palette.primary.main,
		theme.palette.info.main,
		theme.palette.success.main,
		theme.palette.warning.main,
		theme.palette.error.main,
		theme.palette.primary.light,
		theme.palette.info.dark,
		theme.palette.success.light,
		theme.palette.warning.dark,
		theme.palette.text.secondary,
	];
}

export default function FleetUtilizationGraph() {
	const theme = useTheme();
	const [chartData, setChartData] = useState([]);
	const [aircraftTypes, setAircraftTypes] = useState([]);
	const [loading, setLoading] = useState(true);

	const colors = useMemo(() => chartPalette(theme), [theme]);

	useEffect(() => {
		makeApiRequest('GET', '/management/dashboard/')
			.then((response) => {
				const flightHoursData =
					response.aircraft_analytics?.monthly_flight_hours ||
					response.aircraft_analytics?.monthly_flight_hours ||
					{};

				const types = Object.keys(flightHoursData);
				setAircraftTypes(types);

				if (types.length === 0) {
					setLoading(false);
					return;
				}

				const rawMonths = Object.keys(flightHoursData[types[0]]);
				const chronologicalMonths = [...rawMonths].reverse();

				const formattedDataset = chronologicalMonths.map((month) => {
					const row = { month };
					types.forEach((type) => {
						row[type] = flightHoursData[type][month] || 0;
					});
					return row;
				});

				setChartData(formattedDataset);
				setLoading(false);
			})
			.catch((error) => {
				console.error('Error fetching fleet utilization data:', error);
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

	const chartSeries = aircraftTypes.map((type, index) => ({
		dataKey: type,
		label: type,
		color: colors[index % colors.length],
		showMark: true,
	}));

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
					Fleet utilization
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Total flight hours logged per month by aircraft type
				</Typography>

				{chartData.length === 0 ? (
					<Typography align="center" sx={{ py: 4 }} color="text.secondary">
						No flight data recorded for this company.
					</Typography>
				) : (
					<Box sx={{ width: '100%', minWidth: 0 }}>
						<LineChart
							dataset={chartData}
							xAxis={[
								{
									scaleType: 'band',
									dataKey: 'month',
									valueFormatter: (value) => {
										const [year, month] = value.split('-');
										return `${month}/${year.slice(2)}`;
									},
								},
							]}
							yAxis={[{ label: 'Hours flown' }]}
							series={chartSeries}
							height={320}
							margin={{ left: 52, right: 16, top: 16, bottom: 56 }}
							slotProps={{
								legend: {
									direction: 'row',
									position: { vertical: 'bottom', horizontal: 'left' },
									padding: 0,
									labelStyle: { fontSize: 12 },
								},
							}}
						/>
					</Box>
				)}
			</CardContent>
		</Card>
	);
}
