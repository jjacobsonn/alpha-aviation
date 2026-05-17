import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

const SEGMENT_COLORS = {
	flying: '#00A86B',
	maintenance: '#F5A623',
	idle: '#E2DDD9',
};

/**
 * Stacked bar for flying / maintenance / idle hours per tail.
 */
export default function StackedHoursBar({ tail, flying = 0, maintenance = 0, idle = 0 }) {
	const total = flying + maintenance + idle || 1;
	const segments = [
		{ key: 'flying', value: flying, color: SEGMENT_COLORS.flying, label: 'Flying' },
		{ key: 'maintenance', value: maintenance, color: SEGMENT_COLORS.maintenance, label: 'Maint.' },
		{ key: 'idle', value: idle, color: SEGMENT_COLORS.idle, label: 'Idle' },
	];

	return (
		<Box>
			<Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
				<Typography variant="body2" fontWeight={500}>
					{tail}
				</Typography>
				<Typography variant="caption" color="text.secondary">
					{flying.toFixed(1)}h fly · {maintenance.toFixed(1)}h maint
				</Typography>
			</Stack>
			<Box
				sx={{
					display: 'flex',
					height: 10,
					borderRadius: 1,
					overflow: 'hidden',
					bgcolor: 'action.hover',
				}}
				role="img"
				aria-label={`${tail} hours breakdown`}
			>
				{segments.map((seg) =>
					seg.value > 0 ? (
						<Box
							key={seg.key}
							sx={{
								width: `${(seg.value / total) * 100}%`,
								bgcolor: seg.color,
								minWidth: seg.value > 0 ? 4 : 0,
							}}
							title={`${seg.label}: ${seg.value.toFixed(1)}h`}
						/>
					) : null,
				)}
			</Box>
		</Box>
	);
}
