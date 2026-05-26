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

	const recurringRows = recurring.slice(0, 10).map((r) => {
		const tails = r.aircraft_tails?.join(', ') || `${r.aircraft_count} aircraft`;
		return {
			label: `ATA ${r.ata_code}`,
			value: r.count,
			sublabel: `${r.label}${tails ? ` · ${tails}` : ''}`,
			color: '#FF9800',
		};
	});

	const filterFieldSx = { width: '100%', minWidth: 0 };

	return (
		<Card
			elevation={0}
			sx={{
				border: '1px solid',
				borderColor: 'divider',
				borderRadius: 2,
				overflow: 'hidden',
				width: '100%',
			}}
		>
			<CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
				<Stack
					direction={{ xs: 'column', sm: 'row' }}
					spacing={2}
					alignItems={{ sm: 'center' }}
					justifyContent="space-between"
					sx={{ mb: 3 }}
				>
					<Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
						<BuildOutlinedIcon color="primary" sx={{ mt: 0.25, flexShrink: 0 }} />
						<Box sx={{ minWidth: 0 }}>
							<Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
								Maintenance analytics
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Recurring issues, labor trend, and maintenance intensity
							</Typography>
						</Box>
					</Stack>
					<Stack
						direction={{ xs: 'column', md: 'row' }}
						spacing={1.5}
						sx={{ width: '100%', minWidth: 0 }}
					>
						<TextField
							select
							size="small"
							label="Aircraft"
							value={filters.aircraft_id}
							onChange={(e) => onFiltersChange({ ...filters, aircraft_id: e.target.value })}
							sx={filterFieldSx}
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
							sx={filterFieldSx}
						/>
						<TextField
							select
							size="small"
							label="Labor grouping"
							value={filters.group_by}
							onChange={(e) => onFiltersChange({ ...filters, group_by: e.target.value })}
							sx={filterFieldSx}
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
					<Grid container spacing={2} sx={{ width: '100%', m: 0 }}>
						<Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
							<Box
								sx={{
									p: 2,
									borderRadius: 2,
									bgcolor: 'action.hover',
									height: { md: '100%' },
									minWidth: 0,
								}}
							>
								<Typography variant="overline" color="text.secondary">
									Events per 100 flight hours
								</Typography>
								<Typography
									variant="h3"
									fontWeight={700}
									sx={{ my: 1, fontSize: { xs: '2rem', sm: '2.5rem' } }}
								>
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

						<Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
							<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
								Recurring issues (2+ occurrences)
							</Typography>
							<HorizontalBarChart
								rows={recurringRows}
								valueFormatter={(n) => `${n}×`}
								emptyMessage="No recurring patterns in this range. Try widening the date range."
							/>
						</Grid>

						<Grid size={{ xs: 12 }} sx={{ minWidth: 0 }}>
							<Stack
								direction="row"
								alignItems="center"
								spacing={1}
								flexWrap="wrap"
								useFlexGap
								sx={{ mb: 1 }}
							>
								<Typography variant="subtitle2" fontWeight={600}>
									Labor hours
								</Typography>
								<Chip
									size="small"
									label={labor?.available ? "Logged" : "Estimated"}
									color={labor?.available ? "success" : "warning"}
									variant="outlined"
								/>
							</Stack>
							{labor?.note && (
								<Alert severity={labor?.available ? "success" : "info"} sx={{ mb: 2 }}>
									{labor.note}
								</Alert>
							)}
							<HorizontalBarChart
								rows={laborRows}
								valueFormatter={(n) => `${n}h`}
								emptyMessage="No labor data in this period. Log hours on work orders or close WOs with labor."
							/>
						</Grid>
					</Grid>
				)}
			</CardContent>
		</Card>
	);
}
