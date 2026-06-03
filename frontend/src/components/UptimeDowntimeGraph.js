import React, { useState, useEffect, useMemo } from 'react';
import {
	Box,
	Card,
	CardContent,
	CircularProgress,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme } from '@mui/material/styles';
import { makeApiRequest } from '../shared/Api';

const ROW_HEIGHT = 52;
const MIN_CHART_HEIGHT = 320;

function buildRows(rawData) {
	return Object.entries(rawData)
		.map(([key, metrics]) => {
			const totalHours = metrics.total_time_hours || 0;
			const downHours = metrics.down_time_hours || 0;
			const model = metrics.model || '';

			let downtimePercent = 0;
			let uptimePercent = 100;

			if (totalHours > 0) {
				downtimePercent = Math.round((downHours / totalHours) * 100);
				uptimePercent = 100 - downtimePercent;
			}

			// Prefer tail from API; legacy payloads used long model names as keys.
			const looksLikeTail = /^N[A-Z0-9]+$/i.test(key) || key.length <= 12;
			const aircraftLabel = looksLikeTail ? key : key.length > 14 ? `${key.slice(0, 12)}…` : key;

			return {
				aircraftLabel,
				model,
				fullName: model ? `${aircraftLabel} · ${model}` : aircraftLabel,
				uptime: uptimePercent,
				downtime: downtimePercent,
			};
		})
		.sort((a, b) => a.aircraftLabel.localeCompare(b.aircraftLabel, undefined, { numeric: true }));
}

function leftMarginForLabels(labels) {
	const longest = labels.reduce((max, s) => Math.max(max, s.length), 0);
	const charWidth = 7.5;
	return Math.max(96, Math.ceil(longest * charWidth) + 24);
}

export default function AircraftUptimeDowntimeGraph() {
	const theme = useTheme();
	const [chartDataset, setChartDataset] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		makeApiRequest('GET', '/management/dashboard/')
			.then((response) => {
				const rawData = response.aircraft_analytics?.uptime_downtime || {};
				setChartDataset(buildRows(rawData));
				setLoading(false);
			})
			.catch((error) => {
				console.error('Error fetching uptime/downtime telemetry data:', error);
				setLoading(false);
			});
	}, []);

	const chartHeight = Math.max(MIN_CHART_HEIGHT, chartDataset.length * ROW_HEIGHT + 80);
	const leftMargin = useMemo(
		() => leftMarginForLabels(chartDataset.map((r) => r.aircraftLabel)),
		[chartDataset],
	);

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
					By tail number — hover a bar for model and percentages
				</Typography>

				{chartDataset.length === 0 ? (
					<Typography align="center" sx={{ py: 4 }} color="text.secondary">
						No airplane uptime metrics available.
					</Typography>
				) : (
					<Box sx={{ width: '100%', minWidth: 0, overflowX: 'auto' }}>
						<BarChart
							dataset={chartDataset}
							layout="horizontal"
							yAxis={[
								{
									scaleType: 'band',
									dataKey: 'aircraftLabel',
									tickLabelStyle: {
										fontWeight: 600,
										fontSize: 14,
										fill: theme.palette.text.primary,
									},
									tickLabelInterval: () => true,
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
									valueFormatter: (v) => (v > 0 ? `${v}%` : ''),
								},
								{
									dataKey: 'downtime',
									label: 'Downtime',
									stack: 'availability',
									color: theme.palette.error.main,
									borderRadius: 4,
									valueFormatter: (v) => (v > 0 ? `${v}%` : ''),
								},
							]}
							height={chartHeight}
							margin={{ left: leftMargin, right: 28, top: 12, bottom: 52 }}
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
						<Table size="small" sx={{ mt: 2, '& .MuiTableCell-root': { py: 0.75, borderColor: 'divider' } }}>
							<TableHead>
								<TableRow>
									<TableCell sx={{ fontWeight: 700, width: '18%' }}>Tail</TableCell>
									<TableCell sx={{ fontWeight: 700 }}>Model</TableCell>
									<TableCell align="right" sx={{ fontWeight: 700, width: '14%' }}>
										Uptime
									</TableCell>
									<TableCell align="right" sx={{ fontWeight: 700, width: '14%' }}>
										Downtime
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{chartDataset.map((row) => (
									<TableRow key={row.aircraftLabel} hover>
										<TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{row.aircraftLabel}</TableCell>
										<TableCell color="text.secondary">{row.model || '—'}</TableCell>
										<TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>
											{row.uptime}%
										</TableCell>
										<TableCell align="right" sx={{ color: row.downtime ? 'error.main' : 'text.secondary', fontWeight: 600 }}>
											{row.downtime}%
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</Box>
				)}
			</CardContent>
		</Card>
	);
}
