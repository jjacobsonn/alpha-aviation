import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	LinearProgress,
	Stack,
	Typography,
	useTheme,
} from '@mui/material';
import DonutLargeOutlinedIcon from '@mui/icons-material/DonutLargeOutlined';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

function conicGradientStops(segments, total) {
	if (!total) return null;
	let cum = 0;
	const stops = [];
	segments.forEach((seg) => {
		const c = seg.count || 0;
		if (c <= 0) return;
		const start = (cum / total) * 360;
		cum += c;
		const end = (cum / total) * 360;
		stops.push(`${seg.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`);
	});
	return stops.length ? `conic-gradient(${stops.join(', ')})` : null;
}

function trendChip(closuresLast, closuresPrior) {
	if (closuresPrior > 0) {
		const delta = Math.round(((closuresLast - closuresPrior) / closuresPrior) * 100);
		if (delta > 5) {
			return { label: `${delta}% vs prior week`, color: 'success', Icon: TrendingUpIcon };
		}
		if (delta < -5) {
			return { label: `${delta}% vs prior week`, color: 'warning', Icon: TrendingDownIcon };
		}
	}
	if (closuresLast === 0 && closuresPrior === 0) {
		return { label: 'No closures yet', color: 'default', Icon: TrendingFlatIcon };
	}
	return { label: 'vs prior week', color: 'default', Icon: TrendingFlatIcon };
}

/** @param {{ data: object | null, loading?: boolean }} props */
export default function FleetAvailabilityPanel({ data, loading }) {
	const theme = useTheme();
	const bg = theme.palette.background.paper;
	const fleet = data?.fleet;
	const total = fleet?.total_aircraft ?? 0;
	const segments = fleet?.segments || [];
	const gradient = total > 0 ? conicGradientStops(segments, total) : null;
	const prio = data?.open_work_orders_by_priority || {};
	const prioEntries = ['critical', 'high', 'medium', 'low'].map((key) => ({
		key,
		label: key.charAt(0).toUpperCase() + key.slice(1),
		count: prio[key] || 0,
	}));
	const openTotal = data?.open_work_orders_total ?? 0;
	const criticalOpen = data?.critical_open_work_orders ?? 0;
	const pctAvail = data?.available_aircraft_percent ?? 0;
	const t = data?.trends || {};
	const trendMeta = trendChip(t.closures_last_7d || 0, t.closures_prior_7d || 0);
	const TrendIcon = trendMeta.Icon;

	const prioSum = prioEntries.reduce((s, x) => s + x.count, 0);

	return (
		<Card
			elevation={0}
			sx={{
				mb: 4,
				border: '1px solid',
				borderColor: 'divider',
			}}
		>
			<CardContent sx={{ p: { xs: 2, sm: 3 } }}>
				<Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
					<Stack direction="row" spacing={1} alignItems="center">
						<DonutLargeOutlinedIcon color="primary" />
						<Box>
							<Typography variant="h6" sx={{ fontWeight: 700 }}>
								Fleet availability
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Status from fleet records • open work orders by priority
							</Typography>
						</Box>
					</Stack>
					<Button size="small" component={RouterLink} to="/fleet" variant="outlined">
						Fleet
					</Button>
				</Stack>

				<Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems={{ lg: 'flex-start' }}>
					{/* Donut */}
					<Stack alignItems="center" sx={{ minWidth: { lg: 200 } }}>
						<Box sx={{ position: 'relative', width: 176, height: 176 }}>
							<Box
								role="img"
								aria-label={
									total > 0
										? `Fleet status donut: ${segments
												.filter((s) => s.count > 0)
												.map((s) => `${s.label} ${s.count}`)
												.join(', ')}`
										: 'No aircraft'
								}
								sx={{
									width: '100%',
									height: '100%',
									borderRadius: '50%',
									background: gradient || theme.palette.action.hover,
									opacity: loading ? 0.4 : 1,
								}}
							/>
							<Box
								sx={{
									position: 'absolute',
									inset: '20%',
									borderRadius: '50%',
									bgcolor: bg,
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									justifyContent: 'center',
									boxShadow: 1,
								}}
							>
								<Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
									{loading ? '—' : total}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									aircraft
								</Typography>
							</Box>
						</Box>
						<Stack spacing={0.75} sx={{ mt: 2, width: '100%', maxWidth: 280 }}>
							{segments.map((seg) => (
								<Stack direction="row" key={seg.key} alignItems="center" spacing={1} justifyContent="space-between">
									<Stack direction="row" spacing={1} alignItems="center">
										<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: seg.color }} />
										<Typography variant="body2">{seg.label}</Typography>
									</Stack>
									<Typography variant="body2" sx={{ fontWeight: 700 }}>
										{loading ? '—' : seg.count}
									</Typography>
								</Stack>
							))}
							{!loading && total === 0 ? (
								<Typography variant="body2" color="text.secondary">
									No aircraft in this organization yet.
								</Typography>
							) : null}
						</Stack>
					</Stack>

					{/* Priority + KPIs */}
					<Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
						<Box>
							<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
								<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
									Open work orders by priority
								</Typography>
								<Button size="small" component={RouterLink} to="/work-orders">
									View work orders
								</Button>
							</Stack>
							{loading ? (
								<Typography variant="body2" color="text.secondary">
									Loading…
								</Typography>
							) : prioSum === 0 ? (
								<Typography variant="body2" color="text.secondary">
									No open work orders right now.
								</Typography>
							) : (
								<Stack spacing={1}>
									{prioEntries
										.filter((p) => p.count > 0)
										.map((p) => (
											<Box key={p.key}>
												<Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
													<Typography variant="caption" sx={{ fontWeight: 600 }}>
														{p.label}
													</Typography>
													<Typography variant="caption">{p.count}</Typography>
												</Stack>
												<LinearProgress
													variant="determinate"
													value={(p.count / Math.max(openTotal, 1)) * 100}
													color={p.key === 'critical' ? 'error' : p.key === 'high' ? 'warning' : 'primary'}
													sx={{ height: 6, borderRadius: 1 }}
												/>
											</Box>
										))}
								</Stack>
							)}
						</Box>

						<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
							<Card variant="outlined" sx={{ flex: 1, p: 1.5 }}>
								<Stack direction="row" spacing={1} alignItems="flex-start">
									<PendingActionsIcon color="action" fontSize="small" />
									<Box sx={{ flex: 1 }}>
										<Typography variant="caption" color="text.secondary">
											Available share
										</Typography>
										<Typography variant="h5" sx={{ fontWeight: 800 }}>
											{loading ? '—' : `${pctAvail}%`}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											of fleet marked operational (active status)
										</Typography>
									</Box>
								</Stack>
							</Card>
							<Card variant="outlined" sx={{ flex: 1, p: 1.5 }}>
								<Stack direction="row" spacing={1} alignItems="flex-start">
									<WarningAmberOutlinedIcon color={criticalOpen > 0 ? 'warning' : 'action'} fontSize="small" />
									<Box sx={{ flex: 1 }}>
										<Typography variant="caption" color="text.secondary">
											Critical open
										</Typography>
										<Stack direction="row" spacing={1} alignItems="center">
											<Typography variant="h5" sx={{ fontWeight: 800 }}>
												{loading ? '—' : criticalOpen}
											</Typography>
											{criticalOpen > 0 ? <Chip label="Attention" color="warning" size="small" /> : null}
										</Stack>
									</Box>
								</Stack>
							</Card>
							<Card variant="outlined" sx={{ flex: 1, p: 1.5 }}>
								<Stack direction="row" spacing={1} alignItems="flex-start">
									<TrendIcon fontSize="small" color={trendMeta.color === 'success' ? 'success' : 'action'} />
									<Box sx={{ flex: 1 }}>
										<Typography variant="caption" color="text.secondary">
											WOs closed (7 days)
										</Typography>
										<Typography variant="h5" sx={{ fontWeight: 800 }}>
											{loading ? '—' : (t.closures_last_7d ?? '—')}
										</Typography>
										<Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
											{trendMeta.label}
										</Typography>
									</Box>
								</Stack>
							</Card>
						</Stack>
					</Stack>
				</Stack>
			</CardContent>
		</Card>
	);
}
