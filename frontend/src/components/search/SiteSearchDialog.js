import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Box,
	CircularProgress,
	Dialog,
	DialogContent,
	Divider,
	InputAdornment,
	List,
	ListItemButton,
	ListItemText,
	TextField,
	Typography,
	useMediaQuery,
	useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FlightIcon from '@mui/icons-material/Flight';
import BuildIcon from '@mui/icons-material/Build';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import EventIcon from '@mui/icons-material/Event';
import { useNavigate } from 'react-router-dom';
import { fetchGlobalSearch } from '../../shared/Api';
import useDebouncedValue from '../../shared/useDebouncedValue';
import {
	filterSearchGroupsForRole,
	pathForSearchResult,
} from '../../shared/searchNavigation';
import { getEffectiveCompanyRole, isPlatformAdmin } from '../../shared/rbac';
import { useAppContext } from '../../context/AppContext';

const GROUP_ICONS = {
	aircraft: FlightIcon,
	work_orders: BuildIcon,
	discrepancies: ReportProblemOutlinedIcon,
	parts: InventoryIcon,
	flights: EventIcon,
};

function flattenItems(groups) {
	const flat = [];
	(groups || []).forEach((g) => {
		(g.items || []).forEach((item) => {
			flat.push({ ...item, groupKey: g.key, groupLabel: g.label });
		});
	});
	return flat;
}

export default function SiteSearchDialog({ open, onClose }) {
	const theme = useTheme();
	const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
	const navigate = useNavigate();
	const { state } = useAppContext();
	const role = getEffectiveCompanyRole(state);
	const platformAdmin = isPlatformAdmin(state.user);

	const [query, setQuery] = useState('');
	const debouncedQuery = useDebouncedValue(query, 300);
	const [groups, setGroups] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);
	const inputRef = useRef(null);

	const visibleGroups = useMemo(
		() => filterSearchGroupsForRole(groups, role, { platformAdmin }),
		[groups, role, platformAdmin],
	);
	const flatItems = useMemo(() => flattenItems(visibleGroups), [visibleGroups]);

	useEffect(() => {
		if (!open) {
			setQuery('');
			setGroups([]);
			setError('');
			setActiveIndex(0);
			return undefined;
		}
		const t = window.setTimeout(() => inputRef.current?.focus(), 50);
		return () => window.clearTimeout(t);
	}, [open]);

	useEffect(() => {
		if (!open) return undefined;
		const q = debouncedQuery.trim();
		if (q.length < 2) {
			setGroups([]);
			setLoading(false);
			setError('');
			setActiveIndex(0);
			return undefined;
		}
		let cancelled = false;
		setLoading(true);
		setError('');
		fetchGlobalSearch(q)
			.then((data) => {
				if (cancelled) return;
				setGroups(data?.groups || []);
				setActiveIndex(0);
			})
			.catch(() => {
				if (cancelled) return;
				setError('Search is temporarily unavailable.');
				setGroups([]);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [debouncedQuery, open]);

	const goTo = useCallback(
		(item) => {
			const path = pathForSearchResult(item, role);
			if (!path) return;
			onClose();
			navigate(path);
		},
		[navigate, onClose],
	);

	const handleKeyDown = (e) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (flatItems.length) {
				setActiveIndex((i) => (i + 1) % flatItems.length);
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (flatItems.length) {
				setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
			}
		} else if (e.key === 'Enter' && flatItems[activeIndex]) {
			e.preventDefault();
			goTo(flatItems[activeIndex]);
		}
	};

	let runningIndex = -1;

	return (
		<Dialog
			open={open}
			onClose={onClose}
			fullScreen={fullScreen}
			maxWidth="sm"
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: fullScreen ? 0 : 2,
					maxHeight: fullScreen ? '100%' : 'min(72vh, 560px)',
					m: fullScreen ? 0 : 2,
				},
			}}
			aria-labelledby="site-search-title"
		>
			<DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
				<Box sx={{ px: 2, pt: 2, pb: 1 }}>
					<Typography id="site-search-title" variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
						Search workspace
					</Typography>
					<TextField
						inputRef={inputRef}
						fullWidth
						size="small"
						placeholder="Aircraft, work orders, flights…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						autoComplete="off"
						inputProps={{ 'aria-label': 'Site search', spellCheck: 'false' }}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon fontSize="small" color="action" />
								</InputAdornment>
							),
							endAdornment: loading ? (
								<InputAdornment position="end">
									<CircularProgress size={18} />
								</InputAdornment>
							) : null,
						}}
						sx={{
							'& .MuiOutlinedInput-root': { bgcolor: 'action.hover', borderRadius: 2 },
						}}
					/>
					<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
						↑↓ to navigate · Enter to open · Esc to close
					</Typography>
				</Box>
				<Divider />
				<Box sx={{ flex: 1, overflow: 'auto', px: 1, py: 1 }}>
					{error && (
						<Typography color="error" variant="body2" sx={{ px: 2, py: 2 }}>
							{error}
						</Typography>
					)}
					{!error && debouncedQuery.trim().length < 2 && (
						<Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3 }}>
							Type at least 2 characters to search records you have access to.
						</Typography>
					)}
					{!error && debouncedQuery.trim().length >= 2 && !loading && flatItems.length === 0 && (
						<Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3 }}>
							No results for &ldquo;{debouncedQuery.trim()}&rdquo;.
						</Typography>
					)}
					{visibleGroups.map((group) => {
						const Icon = GROUP_ICONS[group.key] || SearchIcon;
						return (
							<Box key={group.key} sx={{ mb: 1 }}>
								<Typography
									variant="overline"
									color="text.secondary"
									sx={{ px: 2, py: 0.5, display: 'block', letterSpacing: 1 }}
								>
									{group.label}
								</Typography>
								<List dense disablePadding>
									{(group.items || []).map((item) => {
										runningIndex += 1;
										const idx = runningIndex;
										const selected = idx === activeIndex;
										return (
											<ListItemButton
												key={`${item.type}-${item.id}`}
												selected={selected}
												onClick={() => goTo(item)}
												onMouseEnter={() => setActiveIndex(idx)}
												sx={{ borderRadius: 1.5, mx: 0.5 }}
											>
												<Icon
													fontSize="small"
													sx={{ mr: 1.5, color: 'text.secondary', flexShrink: 0 }}
												/>
												<ListItemText
													primary={item.title}
													secondary={item.subtitle}
													primaryTypographyProps={{ noWrap: true }}
													secondaryTypographyProps={{ noWrap: true }}
												/>
											</ListItemButton>
										);
									})}
								</List>
							</Box>
						);
					})}
				</Box>
			</DialogContent>
		</Dialog>
	);
}
