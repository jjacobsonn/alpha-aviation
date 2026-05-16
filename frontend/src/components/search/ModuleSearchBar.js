import React from 'react';
import {
	Autocomplete,
	Box,
	Chip,
	IconButton,
	InputAdornment,
	MenuItem,
	Stack,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

/**
 * In-module search: debounced filtering is applied in the parent; this bar is the UI shell.
 * @param {{
 *   value: string,
 *   onChange: (v: string) => void,
 *   placeholder?: string,
 *   suggestions?: string[],
 *   statusOptions?: { value: string, label: string }[],
 *   statusValue?: string | string[],
 *   onStatusChange?: (v: string | string[]) => void,
 *   statusMulti?: boolean,
 *   statusVariant?: 'chips' | 'toggle' | 'select',
 *   resultCount?: number,
 *   totalCount?: number,
 *   extra?: React.ReactNode,
 * }} props
 */
export default function ModuleSearchBar({
	value,
	onChange,
	placeholder = 'Search…',
	suggestions = [],
	statusOptions = [],
	statusValue = 'all',
	onStatusChange,
	statusMulti = false,
	statusVariant = 'chips',
	resultCount,
	totalCount,
	extra,
}) {
	const showCount = resultCount != null && totalCount != null;

	const selectedFilters = statusMulti
		? Array.isArray(statusValue)
			? statusValue.filter((f) => f && f !== 'all')
			: statusValue == null || statusValue === '' || statusValue === 'all'
				? []
				: [String(statusValue)]
		: statusValue === 'all' || statusValue == null || statusValue === ''
			? []
			: [String(statusValue)];

	const chipSelected = (opt) => {
		if (opt.value === 'all') return selectedFilters.length === 0;
		return selectedFilters.includes(opt.value);
	};

	const handleChipClick = (opt) => {
		if (!statusMulti) {
			onStatusChange?.(opt.value);
			return;
		}
		if (opt.value === 'all') {
			onStatusChange?.([]);
			return;
		}
		const next = selectedFilters.includes(opt.value)
			? selectedFilters.filter((v) => v !== opt.value)
			: [...selectedFilters, opt.value];
		onStatusChange?.(next);
	};

	return (
		<Stack spacing={1.25}>
			<Stack
				direction={{ xs: 'column', md: 'row' }}
				spacing={1.5}
				alignItems={{ md: 'center' }}
				useFlexGap
				flexWrap="wrap"
			>
				<Autocomplete
					freeSolo
					disableClearable
					fullWidth
					size="small"
					options={suggestions}
					inputValue={value}
					onInputChange={(_, next, reason) => {
						if (reason === 'reset') return;
						onChange(next);
					}}
					onChange={(_, picked) => {
						if (typeof picked === 'string') onChange(picked);
					}}
					sx={{ flex: 1, minWidth: { xs: '100%', md: 280 } }}
					renderInput={(params) => (
						<TextField
							{...params}
							placeholder={placeholder}
							InputProps={{
								...params.InputProps,
								startAdornment: (
									<>
										<InputAdornment position="start">
											<SearchIcon fontSize="small" color="action" />
										</InputAdornment>
										{params.InputProps.startAdornment}
									</>
								),
								endAdornment: (
									<>
										{value ? (
											<InputAdornment position="end">
												<IconButton
													size="small"
													aria-label="Clear search"
													onClick={() => onChange('')}
													edge="end"
												>
													<ClearIcon fontSize="small" />
												</IconButton>
											</InputAdornment>
										) : null}
										{params.InputProps.endAdornment}
									</>
								),
							}}
						/>
					)}
				/>
				{extra}
				{statusOptions.length > 0 && statusVariant === 'select' ? (
					<TextField
						select
						size="small"
						label="Status"
						value={statusValue}
						onChange={(e) => onStatusChange?.(e.target.value)}
						sx={{ minWidth: 160 }}
					>
						{statusOptions.map((opt) => (
							<MenuItem key={opt.value} value={opt.value}>
								{opt.label}
							</MenuItem>
						))}
					</TextField>
				) : null}
				{statusOptions.length > 0 && statusVariant === 'toggle' ? (
					<ToggleButtonGroup
						size="small"
						value={statusValue}
						exclusive
						onChange={(_, v) => v != null && onStatusChange?.(v)}
						sx={{ flexWrap: 'wrap' }}
					>
						{statusOptions.map((opt) => (
							<ToggleButton key={opt.value} value={opt.value} sx={{ textTransform: 'none' }}>
								{opt.label}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
				) : null}
			</Stack>
			{statusOptions.length > 0 && statusVariant === 'chips' ? (
				<Box>
					{statusMulti ? (
						<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
							Filters (combine as needed)
						</Typography>
					) : null}
					<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
						{statusOptions.map((opt) => (
							<Chip
								key={opt.value}
								size="small"
								label={opt.label}
								clickable
								color={chipSelected(opt) ? 'primary' : 'default'}
								variant={chipSelected(opt) ? 'filled' : 'outlined'}
								onClick={() => handleChipClick(opt)}
							/>
						))}
					</Box>
				</Box>
			) : null}
			{showCount ? (
				<Typography variant="caption" color="text.secondary">
					Showing {resultCount} of {totalCount}
					{value.trim() ? ` · “${value.trim()}”` : ''}
				</Typography>
			) : null}
		</Stack>
	);
}
