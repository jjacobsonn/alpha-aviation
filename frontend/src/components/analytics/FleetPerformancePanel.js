import React from 'react';
import {
	Box,
	Card,
	CardContent,
	Grid,
	MenuItem,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined';
import HorizontalBarChart from './HorizontalBarChart';
import StackedHoursBar from './StackedHoursBar';

export default function FleetPerformancePanel({
	data,
	loading,
	aircraftOptions = [],
	filters,
	onFiltersChange,
}) {
	const utilization = data?.utilization || [];
	const uptime = data?.uptime_by_aircraft || [];
	const otp = data?.on_time_performance;

	const utilRows = utilization.slice(0, 12).map((u) => ({
		label: u.tail,
		value: u.utilization_percent,
		sublabel: `${u.flight_hours}h / ${u.available_hours}h avail`,
		color: '#2B7FD4',
	}));

	const delayRows = (otp?.delay_breakdown || []).map((d) => ({
		label: d.label,
		value: d.count,
		color:
			d.status === 'delayed'
				? '#F5A623'
				: d.status === 'cancelled'
					? '#D92B2B'
					: d.status === 'completed'
						? '#00A86B'
						: '#9e9e9e',
	}));

	return (
		<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
			<CardContent sx={{ p: { xs: 2, sm: 3 } }}>
				<Stack
					direction={{ xs: 'column', sm: 'row' }}
					spacing={2}
					alignItems={{ sm: 'center' }}
					justifyContent="space-between"
					sx={{ mb: 3 }}
				>
					<Stack direction="row" spacing={1.5} alignItems="center">
						<FlightOutlinedIcon color="primary" />
						<Box>
							<Typography variant="h6" fontWeight={600}>
								Fleet performance
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Utilization, uptime mix, and schedule reliability
							</Typography>
						</Box>
					</Stack>
					<TextField
						select
						size="small"
						label="Aircraft"
						value={filters.aircraft_id}
						onChange={(e) => onFiltersChange({ ...filters, aircraft_id: e.target.value })}
						sx={{ minWidth: { sm: 180 }, width: { xs: '100%', sm: 'auto' } }}
					>
						<MenuItem value="">All aircraft</MenuItem>
						{aircraftOptions.map((a) => (
							<MenuItem key={a.id} value={String(a.id)}>
								{a.registration_number || `Aircraft #${a.id}`}
							</MenuItem>
						))}
					</TextField>
				</Stack>

				{loading && (
					<Typography variant="body2" color="text.secondary">
						Loading fleet performance…
					</Typography>
				)}

				{!loading && (
					<Grid container spacing={3}>
						<Grid size={{ xs: 12, md: 4 }}>
							<Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
								<Typography variant="overline" color="text.secondary">
									On-time performance
								</Typography>
								<Typography variant="h3" fontWeight={700} sx={{ my: 1 }}>
									{otp?.on_time_percent != null ? `${otp.on_time_percent}%` : '—'}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									{otp?.on_time_count ?? 0} of {otp?.total_flights ?? 0} flights without delay or
									cancellation
								</Typography>
							</Box>
						</Grid>

						<Grid size={{ xs: 12, md: 8 }}>
							<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
								Utilization (% of available hours flown)
							</Typography>
							<HorizontalBarChart
								rows={utilRows}
								valueFormatter={(n) => `${n}%`}
								emptyMessage="No flight activity in this period."
							/>
						</Grid>

						<Grid size={{ xs: 12, md: 6 }}>
							<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
								Uptime vs downtime (hours by tail)
							</Typography>
							<Stack spacing={1.5}>
								{uptime.length === 0 && (
									<Typography variant="body2" color="text.secondary">
										No aircraft to display.
									</Typography>
								)}
								{uptime.slice(0, 10).map((row) => (
									<StackedHoursBar
										key={row.aircraft_id}
										tail={row.tail}
										flying={row.flying_hours}
										maintenance={row.maintenance_hours}
										idle={row.idle_hours}
									/>
								))}
							</Stack>
							<Stack direction="row" spacing={2} sx={{ mt: 2 }}>
								<LegendDot color="#00A86B" label="Flying" />
								<LegendDot color="#F5A623" label="Maintenance" />
								<LegendDot color="#E2DDD9" label="Idle" />
							</Stack>
						</Grid>

						<Grid size={{ xs: 12, md: 6 }}>
							<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
								Delay breakdown
							</Typography>
							<HorizontalBarChart
								rows={delayRows}
								valueFormatter={(n) => `${n} flights`}
								emptyMessage="No flights in this date range."
							/>
						</Grid>
					</Grid>
				)}
			</CardContent>
		</Card>
	);
}

function LegendDot({ color, label }) {
	return (
		<Stack direction="row" spacing={0.75} alignItems="center">
			<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
		</Stack>
	);
}
