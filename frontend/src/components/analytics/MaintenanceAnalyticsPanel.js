import React from 'react';
import {
	Alert,
	Box,
	Card,
	CardContent,
	Chip,
	Grid,
	MenuItem,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import HorizontalBarChart from './HorizontalBarChart';

export default function MaintenanceAnalyticsPanel({
	data,
	loading,
	aircraftOptions = [],
	filters,
	onFiltersChange,
}) {
	const rate = data?.maintenance_rate;
	const labor = data?.labor_hours;
	const recurring = data?.recurring_issues || [];

	const laborRows = (labor?.series || []).map((p) => ({
		label: p.period,
		value: p.hours,
		sublabel: 'hrs (est.)',
		color: '#2B7FD4',
	}));

	const recurringRows = recurring.slice(0, 10).map((r) => ({
		label: `ATA ${r.ata_code} — ${r.label}`,
		value: r.count,
		sublabel: r.aircraft_tails?.join(', ') || `${r.aircraft_count} aircraft`,
		color: '#FF9800',
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
						<BuildOutlinedIcon color="primary" />
						<Box>
							<Typography variant="h6" fontWeight={600}>
								Maintenance analytics
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Recurring issues, labor trend, and maintenance intensity
							</Typography>
						</Box>
					</Stack>
					<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
						<TextField
							select
							size="small"
							label="Aircraft"
							value={filters.aircraft_id}
							onChange={(e) => onFiltersChange({ ...filters, aircraft_id: e.target.value })}
							sx={{ minWidth: { sm: 160 } }}
						>
							<MenuItem value="">All aircraft</MenuItem>
							{aircraftOptions.map((a) => (
								<MenuItem key={a.id} value={String(a.id)}>
									{a.registration_number || `Aircraft #${a.id}`}
								</MenuItem>
							))}
						</TextField>
						<TextField
							size="small"
							label="ATA chapter"
							value={filters.ata}
							onChange={(e) => {
								const digits = e.target.value.replace(/\D/g, '');
								onFiltersChange({ ...filters, ata: digits });
							}}
							placeholder="29"
							inputMode="numeric"
							inputProps={{ maxLength: 3, 'aria-label': 'ATA chapter number' }}
							sx={{ width: { sm: 110 } }}
						/>
						<TextField
							select
							size="small"
							label="Labor grouping"
							value={filters.group_by}
							onChange={(e) => onFiltersChange({ ...filters, group_by: e.target.value })}
							sx={{ minWidth: { sm: 130 } }}
						>
							<MenuItem value="month">By month</MenuItem>
							<MenuItem value="week">By week</MenuItem>
						</TextField>
					</Stack>
				</Stack>

				{loading && (
					<Typography variant="body2" color="text.secondary">
						Loading maintenance analytics…
					</Typography>
				)}

				{!loading && (
					<Grid container spacing={3}>
						<Grid size={{ xs: 12, md: 4 }}>
							<Box
								sx={{
									p: 2,
									borderRadius: 2,
									bgcolor: 'action.hover',
									height: '100%',
								}}
							>
								<Typography variant="overline" color="text.secondary">
									Events per 100 flight hours
								</Typography>
								<Typography variant="h3" fontWeight={700} sx={{ my: 1 }}>
									{rate?.events_per_100_flight_hours != null
										? rate.events_per_100_flight_hours
										: '—'}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									{rate?.maintenance_events ?? 0} maintenance events ·{' '}
									{rate?.flight_hours ?? 0} flight hours logged
								</Typography>
							</Box>
						</Grid>

						<Grid size={{ xs: 12, md: 8 }}>
							<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
								Recurring issues (2+ occurrences)
							</Typography>
							<HorizontalBarChart
								rows={recurringRows}
								valueFormatter={(n) => `${n}×`}
								emptyMessage="No recurring patterns in this range. Try widening the date range."
							/>
						</Grid>

						<Grid size={{ xs: 12 }}>
							<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
								<Typography variant="subtitle2" fontWeight={600}>
									Labor hours
								</Typography>
								<Chip size="small" label="Estimated" variant="outlined" />
							</Stack>
							{labor?.note && (
								<Alert severity="info" sx={{ mb: 2 }}>
									{labor.note}
								</Alert>
							)}
							<HorizontalBarChart
								rows={laborRows}
								valueFormatter={(n) => `${n}h`}
								emptyMessage="No closed work orders in this period for labor estimates."
							/>
						</Grid>
					</Grid>
				)}
			</CardContent>
		</Card>
	);
}
