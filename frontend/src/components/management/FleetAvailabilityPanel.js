import React, { useMemo } from 'react';
import { Link as RouterLink } from 'react-router';
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	Grid,
	Link,
	Stack,
	Typography,
	alpha,
	useTheme,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DonutLargeOutlinedIcon from '@mui/icons-material/DonutLargeOutlined';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const PRIO_LABELS = {
	critical: 'Critical',
	high: 'High',
	medium: 'Medium',
	low: 'Low',
};

function segmentStyle(seg, theme) {
	const fallbacks = {
		available: theme.palette.success.main,
		in_maintenance: theme.palette.warning.main,
		grounded: theme.palette.error.main,
	};
	const color = seg.color || fallbacks[seg.key] || theme.palette.text.disabled;
	return { color, bg: alpha(color, 0.12) };
}

function priorityColor(theme, key) {
	switch (key) {
		case 'critical':
			return theme.palette.error.main;
		case 'high':
			return theme.palette.warning.main;
		case 'medium':
			return theme.palette.info.main;
		case 'low':
			return theme.palette.text.secondary;
		default:
			return theme.palette.text.secondary;
	}
}

/** Shared overflow-safe flex child */
const flexMin = { minWidth: 0, maxWidth: '100%' };

function formatAsOf(iso) {
	if (!iso) return null;
	try {
		return new Date(iso).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
	} catch {
		return null;
	}
}

function closureTrend(last, prior) {
	if (prior > 0) {
		const delta = Math.round(((last - prior) / prior) * 100);
		if (delta > 5) {
			return { label: `↑ ${delta}% vs prior week`, tone: 'success', Icon: TrendingUpIcon };
		}
		if (delta < -5) {
			return { label: `↓ ${Math.abs(delta)}% vs prior week`, tone: 'warning', Icon: TrendingDownIcon };
		}
	}
	if (last === 0 && prior === 0) {
		return { label: 'No closures yet this period', tone: 'muted', Icon: TrendingFlatIcon };
	}
	if (last > prior) {
		return { label: `↑ ${last - prior} more than prior week`, tone: 'success', Icon: TrendingUpIcon };
	}
	if (last < prior) {
		return { label: `↓ ${prior - last} fewer than prior week`, tone: 'warning', Icon: TrendingDownIcon };
	}
	return { label: 'Flat vs prior week', tone: 'muted', Icon: TrendingFlatIcon };
}

function readinessLabel(pctAvail, grounded, criticalOpen) {
	if (criticalOpen > 0) return 'Action required — critical maintenance open';
	if (grounded > 0 && pctAvail < 100) return 'Dispatch impact — grounded aircraft in fleet';
	if (pctAvail >= 80) return 'Fleet readiness healthy for operations';
	if (pctAvail >= 50) return 'Partial readiness — review non-active aircraft';
	return 'Low readiness — majority of fleet not dispatch-ready';
}

function pctOf(count, total) {
	if (!total) return 0;
	return Math.round((count / total) * 1000) / 10;
}

function surfaceSx(theme) {
	return {
		borderRadius: 2,
		border: '1px solid',
		borderColor: 'divider',
		bgcolor: theme.palette.background.paper,
		p: { xs: 1.75, sm: 2, md: 2.5 },
		width: '100%',
		minWidth: 0,
		boxSizing: 'border-box',
		boxShadow: `0 1px 2px ${alpha(theme.palette.text.primary, 0.06)}`,
	};
}

function PanelHeader({ title, subtitle, asOfLabel, action }) {
	const theme = useTheme();
	return (
		<Stack
			direction={{ xs: 'column', md: 'row' }}
			spacing={{ xs: 1.5, md: 2 }}
			alignItems={{ xs: 'stretch', md: 'flex-start' }}
			justifyContent="space-between"
			sx={{ mb: { xs: 2, sm: 2.5 }, ...flexMin }}
		>
			<Stack direction="row" spacing={1.5} alignItems="flex-start" sx={flexMin}>
				<Box
					sx={{
						mt: 0.25,
						p: 1,
						borderRadius: 1.5,
						bgcolor: alpha(theme.palette.info.main, 0.08),
						color: 'info.main',
						display: 'flex',
						flexShrink: 0,
					}}
				>
					<DonutLargeOutlinedIcon fontSize="small" />
				</Box>
				<Box sx={flexMin}>
					<Typography
						variant="h6"
						component="h2"
						sx={{
							fontWeight: 800,
							letterSpacing: '-0.02em',
							lineHeight: 1.25,
							fontSize: { xs: '1.1rem', sm: '1.25rem' },
						}}
					>
						{title}
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mt: 0.25, wordBreak: 'break-word' }}
					>
						{subtitle}
					</Typography>
					{asOfLabel ? (
						<Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
							Updated {asOfLabel}
						</Typography>
					) : null}
				</Box>
			</Stack>
			<Box sx={{ flexShrink: 0, width: { xs: '100%', md: 'auto' } }}>{action}</Box>
		</Stack>
	);
}

function SectionHeader({ overline, body, action }) {
	return (
		<Stack
			direction={{ xs: 'column', sm: 'row' }}
			spacing={{ xs: 1, sm: 1.5 }}
			justifyContent="space-between"
			alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
			sx={{ mb: 2, ...flexMin }}
		>
			<Box sx={flexMin}>
				<Typography
					variant="overline"
					component="h3"
					sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', display: 'block' }}
				>
					{overline}
				</Typography>
				{body ? (
					<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, wordBreak: 'break-word' }}>
						{body}
					</Typography>
				) : null}
			</Box>
			{action ? <Box sx={{ flexShrink: 0, alignSelf: { xs: 'stretch', sm: 'auto' } }}>{action}</Box> : null}
		</Stack>
	);
}

function MetricTile({ label, value, sublabel, trend, trendTone, chip, href }) {
	const theme = useTheme();
	const trendColor =
		trendTone === 'success'
			? 'success.main'
			: trendTone === 'warning'
				? 'warning.main'
				: 'text.secondary';

	const inner = (
		<Box
			sx={{
				...surfaceSx(theme),
				display: 'flex',
				flexDirection: 'column',
				gap: 1,
				height: '100%',
				minHeight: { xs: 'auto', sm: 108 },
				transition: 'box-shadow 0.2s, border-color 0.2s',
				'&:hover': href
					? {
							boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
							borderColor: alpha(theme.palette.info.main, 0.35),
						}
					: undefined,
			}}
		>
			<Typography
				variant="overline"
				sx={{
					fontWeight: 600,
					letterSpacing: '0.06em',
					color: 'text.secondary',
					lineHeight: 1.35,
					wordBreak: 'break-word',
				}}
			>
				{label}
			</Typography>
			<Box sx={flexMin}>
				<Typography
					variant="h4"
					component="p"
					sx={{
						fontWeight: 800,
						lineHeight: 1.1,
						letterSpacing: '-0.02em',
						fontSize: { xs: '1.75rem', sm: '2rem' },
					}}
				>
					{value}
				</Typography>
				{sublabel ? (
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mt: 0.5, fontWeight: 500, wordBreak: 'break-word' }}
					>
						{sublabel}
					</Typography>
				) : null}
			</Box>
			<Stack
				direction={{ xs: 'column', sm: 'row' }}
				alignItems={{ xs: 'flex-start', sm: 'center' }}
				justifyContent="space-between"
				spacing={0.75}
				sx={{ mt: 'auto', ...flexMin }}
			>
				{trend ? (
					<Typography
						variant="caption"
						sx={{ color: trendColor, fontWeight: 600, wordBreak: 'break-word', lineHeight: 1.4 }}
					>
						{trend}
					</Typography>
				) : null}
				{chip ? <Box sx={{ flexShrink: 0 }}>{chip}</Box> : null}
			</Stack>
		</Box>
	);

	if (href) {
		return (
			<Link
				component={RouterLink}
				to={href}
				underline="none"
				color="inherit"
				sx={{ display: 'block', height: '100%', minWidth: 0 }}
			>
				{inner}
			</Link>
		);
	}
	return inner;
}

function FleetStatusStack({ segments, total, loading }) {
	const theme = useTheme();
	if (loading) {
		return <Box sx={{ height: 12, borderRadius: 1, bgcolor: 'action.hover' }} />;
	}
	if (!total) {
		return (
			<Typography variant="body2" color="text.secondary">
				No aircraft in this organization yet.
			</Typography>
		);
	}

	const active = segments.filter((s) => (s.count || 0) > 0);

	return (
		<Box
			role="img"
			aria-label={active.map((s) => `${s.label} ${s.count}`).join(', ')}
			sx={{
				display: 'flex',
				height: 12,
				borderRadius: 1.5,
				overflow: 'hidden',
				bgcolor: 'action.hover',
				width: '100%',
			}}
		>
			{active.map((seg) => {
				const { color } = segmentStyle(seg, theme);
				const widthPct = (seg.count / total) * 100;
				return (
					<Box
						key={seg.key}
						title={`${seg.label}: ${seg.count} (${pctOf(seg.count, total)}%)`}
						sx={{
							width: `${widthPct}%`,
							minWidth: widthPct > 0 ? 4 : 0,
							bgcolor: color,
							transition: 'opacity 0.2s, filter 0.2s',
							'&:hover': { opacity: 0.88, filter: 'brightness(1.05)' },
						}}
					/>
				);
			})}
		</Box>
	);
}

function PriorityBars({ entries, openTotal, loading, theme }) {
	if (loading) {
		return <Typography variant="body2" color="text.secondary">Loading…</Typography>;
	}
	if (!openTotal) {
		return (
			<Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
				No open work orders — fleet maintenance queue is clear.
			</Typography>
		);
	}

	return (
		<Stack spacing={1.75} sx={{ width: '100%', minWidth: 0 }}>
			{entries
				.filter((p) => p.count > 0)
				.map((p) => {
					const barColor = priorityColor(theme, p.key);
					const label = PRIO_LABELS[p.key] || p.label;
					const share = pctOf(p.count, openTotal);
					return (
						<Box key={p.key} sx={flexMin}>
							<Stack
								direction={{ xs: 'column', sm: 'row' }}
								justifyContent="space-between"
								alignItems={{ xs: 'flex-start', sm: 'baseline' }}
								spacing={0.25}
								sx={{ mb: 0.75 }}
							>
								<Typography variant="body2" sx={{ fontWeight: 600 }}>
									{label}
								</Typography>
								<Typography variant="body2" color="text.secondary" sx={{ whiteSpace: { sm: 'nowrap' } }}>
									<Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
										{p.count}
									</Box>
									{' · '}
									{share}% of open
								</Typography>
							</Stack>
							<Box
								role="img"
								aria-label={`${label}: ${p.count}`}
								sx={{ height: 10, borderRadius: 1, bgcolor: 'action.hover', overflow: 'hidden', width: '100%' }}
							>
								<Box
									sx={{
										height: '100%',
										width: `${share}%`,
										borderRadius: 1,
										bgcolor: barColor,
										transition: 'width 0.35s ease',
									}}
								/>
							</Box>
						</Box>
					);
				})}
		</Stack>
	);
}

/** @param {{ data: object | null, loading?: boolean }} props */
export default function FleetAvailabilityPanel({ data, loading }) {
	const theme = useTheme();
	const fleet = data?.fleet;
	const total = fleet?.total_aircraft ?? 0;
	const segments = fleet?.segments || [];
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
	const closureTrendMeta = closureTrend(t.closures_last_7d || 0, t.closures_prior_7d || 0);
	const asOfLabel = formatAsOf(data?.as_of);

	const grounded = segments.find((s) => s.key === 'grounded')?.count ?? 0;
	const inMaint = segments.find((s) => s.key === 'in_maintenance')?.count ?? 0;

	const alerts = useMemo(() => {
		const items = [];
		if (!loading && criticalOpen > 0) {
			items.push({
				severity: 'error',
				text: `${criticalOpen} critical work order${criticalOpen === 1 ? '' : 's'} require immediate attention`,
			});
		}
		if (!loading && grounded > 0) {
			items.push({
				severity: 'warning',
				text: `${grounded} aircraft grounded or AOG — confirm before dispatch`,
			});
		}
		if (!loading && inMaint > 0) {
			items.push({
				severity: 'info',
				text: `${inMaint} aircraft with maintenance due — schedule inspections`,
			});
		}
		return items;
	}, [loading, criticalOpen, grounded, inMaint]);

	const workOrdersLink = (
		<Link
			component={RouterLink}
			to="/work-orders"
			variant="body2"
			underline="hover"
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 0.25,
				fontWeight: 600,
				color: 'primary.main',
				width: { xs: '100%', sm: 'auto' },
				justifyContent: { xs: 'flex-start', sm: 'flex-end' },
				wordBreak: 'break-word',
			}}
		>
			View all work orders
			<ArrowForwardIcon sx={{ fontSize: 16, flexShrink: 0 }} />
		</Link>
	);

	return (
		<Card
			elevation={0}
			sx={{
				mb: 4,
				border: '1px solid',
				borderColor: 'divider',
				boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
				bgcolor: 'background.paper',
				width: '100%',
				minWidth: 0,
				overflow: 'hidden',
			}}
		>
			<CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
				<PanelHeader
					title="Fleet availability"
					subtitle="Readiness, open maintenance load, and 7-day closure activity"
					asOfLabel={asOfLabel}
					action={
						<Button
							size="small"
							component={RouterLink}
							to="/fleet"
							variant="outlined"
							fullWidth
							sx={{
								width: { xs: '100%', md: 'auto' },
								borderColor: 'info.main',
								color: 'info.main',
								'&:hover': {
									borderColor: '#1f5fa8',
									bgcolor: alpha(theme.palette.info.main, 0.06),
								},
							}}
						>
							View fleet
						</Button>
					}
				/>

				{alerts.length > 0 ? (
					<Stack spacing={1} sx={{ mb: 2.5 }}>
						{alerts.map((a) => (
							<Alert
								key={a.text}
								severity={a.severity}
								variant="outlined"
								sx={{
									alignItems: 'flex-start',
									'& .MuiAlert-message': {
										width: '100%',
										minWidth: 0,
										wordBreak: 'break-word',
										overflowWrap: 'anywhere',
									},
								}}
							>
								{a.text}
							</Alert>
						))}
					</Stack>
				) : null}

				{/*
				 * Main panels: full-width stack until lg (≥1200px), then side-by-side.
				 * Avoids cramped split-screen / tablet layouts.
				 */}
				<Grid container spacing={2} sx={{ mb: 2 }} alignItems="stretch">
					<Grid item xs={12} lg={5} sx={{ display: 'flex', minWidth: 0 }}>
						<Box sx={{ ...surfaceSx(theme), flex: 1 }}>
							<SectionHeader
								overline="Fleet readiness"
								body={loading ? '—' : readinessLabel(pctAvail, grounded, criticalOpen)}
							/>
							<FleetStatusStack segments={segments} total={total} loading={loading} />
							<Stack spacing={1} sx={{ mt: 2 }}>
								{segments.map((seg) => {
									const { color, bg } = segmentStyle(seg, theme);
									const count = seg.count || 0;
									const pct = pctOf(count, total);
									return (
										<Stack
											key={seg.key}
											direction={{ xs: 'column', sm: 'row' }}
											spacing={{ xs: 0.25, sm: 0 }}
											alignItems={{ xs: 'flex-start', sm: 'center' }}
											justifyContent="space-between"
											sx={{
												py: 0.75,
												px: 1,
												mx: -1,
												borderRadius: 1,
												transition: 'background-color 0.15s',
												'&:hover': { bgcolor: bg },
												...flexMin,
											}}
										>
											<Stack direction="row" spacing={1.25} alignItems="center" sx={flexMin}>
												<Box
													sx={{
														width: 8,
														height: 8,
														borderRadius: '50%',
														bgcolor: color,
														flexShrink: 0,
													}}
												/>
												<Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
													{seg.label}
												</Typography>
											</Stack>
											<Typography
												variant="body2"
												color="text.secondary"
												sx={{ flexShrink: 0, pl: { xs: 2.25, sm: 0 } }}
											>
												<Box component="span" sx={{ fontWeight: 700, color: 'text.primary', mr: 0.5 }}>
													{loading ? '—' : count}
												</Box>
												{loading || !total ? '' : `· ${pct}%`}
											</Typography>
										</Stack>
									);
								})}
							</Stack>
						</Box>
					</Grid>

					<Grid item xs={12} lg={7} sx={{ display: 'flex', minWidth: 0 }}>
						<Box sx={{ ...surfaceSx(theme), flex: 1, display: 'flex', flexDirection: 'column' }}>
							<SectionHeader
								overline="Open work orders"
								body={
									loading
										? '—'
										: openTotal
											? `${openTotal} open across the fleet by priority`
											: 'No open work orders'
								}
								action={workOrdersLink}
							/>
							<Box sx={{ flex: 1, minWidth: 0 }}>
								<PriorityBars
									entries={prioEntries}
									openTotal={openTotal}
									loading={loading}
									theme={theme}
								/>
							</Box>
							{!loading && openTotal > 0 ? (
								<Stack
									direction="row"
									flexWrap="wrap"
									gap={1}
									sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}
								>
									{criticalOpen > 0 ? (
										<Chip label={`${criticalOpen} critical`} size="small" color="error" variant="outlined" />
									) : null}
									<Chip
										label={`${openTotal} total open`}
										size="small"
										variant="outlined"
										component={RouterLink}
										to="/work-orders"
										clickable
									/>
									<Chip
										label="Maintenance hub"
										size="small"
										variant="outlined"
										component={RouterLink}
										to="/maintenance"
										clickable
									/>
								</Stack>
							) : null}
						</Box>
					</Grid>
				</Grid>

				{/*
				 * Metrics: 1 col (xs) → 2 col (sm–md) → 4 col (lg+).
				 * Stays readable in split-screen and tablet landscape.
				 */}
				<Box
					sx={{
						display: 'grid',
						gridTemplateColumns: {
							xs: 'minmax(0, 1fr)',
							sm: 'repeat(2, minmax(0, 1fr))',
							lg: 'repeat(4, minmax(0, 1fr))',
						},
						gap: { xs: 1.5, sm: 2 },
						width: '100%',
						minWidth: 0,
					}}
				>
					<MetricTile
						label="Operational"
						value={loading ? '—' : `${pctAvail}%`}
						sublabel="Dispatch-ready (active status)"
						trend={
							loading
								? null
								: pctAvail >= 80
									? 'Healthy readiness'
									: pctAvail >= 50
										? 'Review non-active aircraft'
										: 'Low readiness'
						}
						trendTone={pctAvail >= 80 ? 'success' : pctAvail >= 50 ? 'muted' : 'warning'}
						href="/fleet"
					/>
					<MetricTile
						label="Critical open"
						value={loading ? '—' : criticalOpen}
						sublabel="Requires immediate review"
						trend={loading ? null : criticalOpen ? 'Dispatch risk until cleared' : 'No critical backlog'}
						trendTone={criticalOpen ? 'warning' : 'success'}
						chip={
							!loading && criticalOpen > 0 ? (
								<Chip label="Attention" color="warning" size="small" />
							) : null
						}
						href="/work-orders"
					/>
					<MetricTile
						label="Closed (7 days)"
						value={loading ? '—' : (t.closures_last_7d ?? 0)}
						sublabel="Work orders completed"
						trend={loading ? null : closureTrendMeta.label}
						trendTone={closureTrendMeta.tone}
						href="/work-orders"
					/>
					<MetricTile
						label="Open workload"
						value={loading ? '—' : openTotal}
						sublabel="Active maintenance items"
						trend={
							loading
								? null
								: openTotal
									? `${prioEntries.filter((p) => p.key === 'high' || p.key === 'critical').reduce((s, p) => s + p.count, 0)} high or critical`
									: 'Queue clear'
						}
						trendTone={openTotal > 5 ? 'warning' : 'muted'}
						href="/maintenance"
					/>
				</Box>
			</CardContent>
		</Card>
	);
}
