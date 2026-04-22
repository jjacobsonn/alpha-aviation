import React, { useMemo } from 'react';
import { Autocomplete, Box, Chip, TextField, Typography } from '@mui/material';

function statusColor(status) {
	switch (status) {
		case 'aog':
		case 'grounded':
			return 'error';
		case 'maintenance_due':
			return 'warning';
		default:
			return 'success';
	}
}

function aircraftLabel(aircraft) {
	if (!aircraft) return '';
	const tail = aircraft.registration_number || aircraft.tail_number || 'Unknown tail';
	const model = aircraft.model || 'Unknown model';
	const location = aircraft.location || 'Unassigned';
	return `${tail} (${model}) • ${location}`;
}

export default function AircraftSelector({
	label = 'Aircraft',
	value = '',
	onChange,
	options = [],
	disabled = false,
	required = false,
	helperText = '',
}) {
	const selectedOption = useMemo(
		() => options.find((o) => String(o.id) === String(value)) || null,
		[options, value]
	);

	return (
		<Autocomplete
			fullWidth
			options={options}
			value={selectedOption}
			disabled={disabled}
			getOptionLabel={aircraftLabel}
			isOptionEqualToValue={(option, selected) =>
				String(option?.id) === String(selected?.id)
			}
			onChange={(_event, next) => onChange?.(next ? String(next.id) : '')}
			renderOption={(props, option) => (
				<Box component="li" {...props} key={option.id}>
					<Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
						<Box sx={{ minWidth: 0 }}>
							<Typography variant="body2" sx={{ fontWeight: 600 }}>
								{option.registration_number} ({option.model})
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{option.location || 'Unassigned location'}
							</Typography>
						</Box>
						<Chip
							size="small"
							label={option.fleet_status || 'active'}
							color={statusColor(option.fleet_status)}
							variant="outlined"
						/>
					</Box>
				</Box>
			)}
			renderInput={(params) => (
				<TextField
					{...params}
					label={label}
					required={required}
					helperText={helperText}
				/>
			)}
		/>
	);
}
