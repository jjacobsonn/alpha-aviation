import React from 'react';
import { Box, Button, Chip, Grid, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const STATUS_CHIP_PROPS = {
	discrepancy: {
		pending: { label: 'Pending', color: 'warning' },
		closed: { label: 'Closed', color: 'success' },
	},
	workorder: {
		open: { label: 'Open', color: 'info' },
		in_progress: { label: 'In Progress', color: 'primary' },
		awaiting_parts: { label: 'Awaiting Parts', color: 'warning' },
		closed: { label: 'Closed', color: 'success' },
	},
};

export function MaintenanceStatusChip({ status, kind = 'discrepancy', labelOverride }) {
	const key = String(status || '').toLowerCase();
	const map = STATUS_CHIP_PROPS[kind] || {};
	const cfg = map[key] || { label: labelOverride || status || '—', color: 'default' };
	return (
		<Chip
			size="small"
			label={labelOverride || cfg.label}
			color={cfg.color}
			sx={{ fontWeight: 700, height: 26, fontSize: '0.8125rem' }}
		/>
	);
}

/** Hero header: aircraft, summary, status, optional actions. */
export function MaintenanceRecordHeader({
	eyebrow,
	primary,
	secondary,
	summary,
	status,
	statusKind = 'discrepancy',
	statusLabel,
	metaLine,
	actions,
}) {
	return (
		<Box
			sx={{
				px: 2,
				py: 1.75,
				borderBottom: '1px solid',
				borderColor: 'divider',
				bgcolor: 'secondary.main',
			}}
		>
			<Stack
				direction={{ xs: 'column', sm: 'row' }}
				spacing={1.5}
				justifyContent="space-between"
				alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
			>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					{eyebrow ? (
						<Typography
							variant="caption"
							sx={{
								color: 'primary.main',
								fontWeight: 700,
								letterSpacing: 0.4,
								textTransform: 'uppercase',
								display: 'block',
								mb: 0.25,
							}}
						>
							{eyebrow}
						</Typography>
					) : null}
					<Typography
						variant="h6"
						sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: { xs: '1.15rem', sm: '1.25rem' } }}
					>
						{primary}
					</Typography>
					{secondary ? (
						<Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
							{secondary}
						</Typography>
					) : null}
					{summary ? (
						<Typography
							variant="body2"
							sx={{
								mt: 1,
								fontWeight: 500,
								lineHeight: 1.45,
								color: 'text.primary',
								display: '-webkit-box',
								WebkitLineClamp: 2,
								WebkitBoxOrient: 'vertical',
								overflow: 'hidden',
							}}
						>
							{summary}
						</Typography>
					) : null}
					{metaLine ? (
						<Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
							{metaLine}
						</Typography>
					) : null}
				</Box>
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					{status != null && status !== '' ? (
						<MaintenanceStatusChip
							status={status}
							kind={statusKind}
							labelOverride={statusLabel}
						/>
					) : null}
					{actions}
				</Stack>
			</Stack>
		</Box>
	);
}

/** Compact label/value grid for secondary metadata (ATA, tach, dates). */
export function MaintenanceMetaGrid({ items }) {
	const cells = (items || []).filter((i) => i && (i.value != null && i.value !== ''));
	if (!cells.length) return null;
	return (
		<Grid container spacing={1.5} sx={{ py: 0.25 }}>
			{cells.map((item) => (
				<Grid item xs={6} sm={4} md={3} key={item.label}>
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{
							display: 'block',
							fontSize: '0.6875rem',
							fontWeight: 600,
							textTransform: 'uppercase',
							letterSpacing: 0.4,
							lineHeight: 1.2,
						}}
					>
						{item.label}
					</Typography>
					<Typography variant="body2" sx={{ fontWeight: 600, mt: 0.2, lineHeight: 1.3 }}>
						{item.value ?? '—'}
					</Typography>
				</Grid>
			))}
		</Grid>
	);
}

/** Personnel strip — dense, no input chrome. */
export function MaintenancePeopleStrip({ title = 'Personnel', people }) {
	const rows = (people || []).filter((p) => p?.name && p.name !== '—');
	if (!rows.length) return null;
	return (
		<Box
			sx={{
				px: 1.5,
				py: 1.25,
				borderRadius: 1.5,
				border: '1px solid',
				borderColor: 'divider',
				bgcolor: 'background.paper',
			}}
		>
			<Typography
				variant="caption"
				sx={{
					fontWeight: 700,
					textTransform: 'uppercase',
					letterSpacing: 0.5,
					color: 'text.secondary',
					display: 'block',
					mb: 1,
				}}
			>
				{title}
			</Typography>
			<Grid container spacing={1.5}>
				{rows.map((p) => (
					<Grid item xs={12} sm={4} key={p.role}>
						<Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
							{p.role}
						</Typography>
						<Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
							{p.name}
						</Typography>
					</Grid>
				))}
			</Grid>
		</Box>
	);
}

export function MaintenanceDescriptionBlock({ title = 'Squawk', children, text }) {
	return (
		<Box>
			<Typography
				variant="caption"
				sx={{
					fontWeight: 700,
					textTransform: 'uppercase',
					letterSpacing: 0.5,
					color: 'text.secondary',
					display: 'block',
					mb: 0.75,
				}}
			>
				{title}
			</Typography>
			{children ?? (
				<Typography
					variant="body2"
					sx={{ lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
				>
					{text || '—'}
				</Typography>
			)}
		</Box>
	);
}

export function MaintenancePanelSection({ title, children, sx }) {
	return (
		<Box sx={sx}>
			{title ? (
				<Typography
					variant="caption"
					sx={{
						fontWeight: 700,
						textTransform: 'uppercase',
						letterSpacing: 0.5,
						color: 'text.secondary',
						display: 'block',
						mb: 1,
					}}
				>
					{title}
				</Typography>
			) : null}
			{children}
		</Box>
	);
}

export function MaintenanceOpenRecordButton({ label, onClick }) {
	return (
		<Button
			variant="contained"
			color="primary"
			size="small"
			onClick={onClick}
			endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
			sx={{
				textTransform: 'none',
				fontWeight: 600,
				fontSize: '0.8125rem',
				px: 1.5,
				py: 0.5,
				minHeight: 32,
				boxShadow: 'none',
				whiteSpace: 'nowrap',
				'&:hover': { boxShadow: 1 },
			}}
		>
			{label}
		</Button>
	);
}

export function MaintenanceLinkButton({ label, onClick, fullWidth }) {
	return (
		<Button
			variant="outlined"
			color="primary"
			size="small"
			fullWidth={fullWidth}
			onClick={onClick}
			sx={{
				textTransform: 'none',
				fontWeight: 600,
				fontSize: '0.8125rem',
				justifyContent: fullWidth ? 'flex-start' : 'center',
				py: 0.5,
				minHeight: 32,
			}}
		>
			{label}
		</Button>
	);
}

export function MaintenanceActivityTimeline({ items, emptyHint, formatSummary }) {
	if (!items?.length) {
		return (
			<Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
				{emptyHint}
			</Typography>
		);
	}
	return (
		<Stack spacing={0.75}>
			{items.map((a) => (
				<Box
					key={a.id}
					sx={{
						pl: 1.25,
						py: 0.75,
						borderLeft: '2px solid',
						borderColor: 'primary.light',
					}}
				>
					<Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
						{a.created_at ? new Date(a.created_at).toLocaleString() : ''}
						{a.actor_display ? ` · ${a.actor_display}` : ''}
						{a.event_type ? ` · ${a.event_type}` : ''}
					</Typography>
					<Typography variant="body2" sx={{ mt: 0.25, lineHeight: 1.4, wordBreak: 'break-word' }}>
						{formatSummary ? formatSummary(a.summary) : a.summary || '—'}
					</Typography>
				</Box>
			))}
		</Stack>
	);
}

export function discrepancySummaryLine(discrepancy, maxLen = 120) {
	const desc = (discrepancy?.description || '').trim();
	const line = desc.split(/\r?\n/)[0].trim();
	if (!line) return `Discrepancy #${discrepancy?.id ?? '—'}`;
	if (line.length <= maxLen) return line;
	return `${line.slice(0, maxLen - 1)}…`;
}

export function parseAircraftFromEntity(entity) {
	if (!entity?.aircraft) {
		return { tail: '—', model: '', full: '—' };
	}
	const ac = entity.aircraft;
	if (typeof ac === 'object' && ac != null) {
		const tail = ac.registration_number || '—';
		const model = (ac.model || '').trim();
		return {
			tail,
			model,
			full: model ? `${tail} · ${model}` : tail,
		};
	}
	return { tail: String(ac), model: '', full: String(ac) };
}
