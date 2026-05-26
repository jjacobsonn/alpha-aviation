import React, { useEffect, useMemo, useState } from 'react';
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	MenuItem,
	Stack,
	TextField,
	Typography,
	useMediaQuery,
	useTheme,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import {
	deleteWorkorder,
	fetchCompanyAircrafts,
	fetchCompanyUsers,
	fetchParts,
	fetchServiceHistoryDetail,
	updateWorkorder,
} from '../../shared/Api';
import DeleteConfirmationDialog from '../DeleteConfirmationDialog';
import LaborEntriesPanel from '../maintenance/LaborEntriesPanel';
import { workOrderHeadline, workOrderSourceLabel } from '../../shared/workOrderDisplay';
import { profileDisplayName, resolvePersonDisplay } from '../../shared/profileDisplay';

const WORK_ORDER_STATUS_OPTIONS = [
	{ value: 'open', label: 'Open' },
	{ value: 'in_progress', label: 'In Progress' },
	{ value: 'awaiting_parts', label: 'Awaiting Parts' },
	{ value: 'closed', label: 'Closed' },
];

const WORK_ORDER_PRIORITY_OPTIONS = [
	{ value: 'low', label: 'Low' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'high', label: 'High' },
	{ value: 'critical', label: 'Critical' },
];

const emptyForm = {
	title: '',
	aircraft: '',
	created_by: '',
	parts_needed: [],
	description: '',
	status: 'open',
	priority: 'medium',
	due_by: '',
	ata_code: '',
	components_affected: '',
};

function aircraftLabel(ac) {
	if (!ac) return '—';
	if (typeof ac === 'object') {
		return `${ac.registration_number || ''} (${ac.model || ''})`.trim() || '—';
	}
	return String(ac);
}

function partAircraftId(p) {
	if (!p) return null;
	const a = p.aircraft;
	if (typeof a === 'object' && a != null) return a.id;
	return a;
}

function formatStatus(value) {
	return String(value || '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEventType(value) {
	if (!value) return 'Update';
	return String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function unwrapList(data) {
	if (Array.isArray(data)) return data;
	if (data && Array.isArray(data.results)) return data.results;
	return [];
}

function Field({ label, value, children }) {
	return (
		<Box>
			<Typography variant="caption" color="text.secondary" display="block">
				{label}
			</Typography>
			{children ?? (
				<Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
					{value ?? '—'}
				</Typography>
			)}
		</Box>
	);
}

function ActivityTimeline({ items }) {
	if (!items?.length) {
		return (
			<Typography variant="body2" color="text.secondary">
				No edit history yet. Changes will appear here with who made them.
			</Typography>
		);
	}
	return (
		<Stack spacing={1.5} sx={{ maxHeight: 220, overflow: 'auto', pr: 0.5 }}>
			{items.map((a) => (
				<Box
					key={a.id}
					sx={{
						borderLeft: '3px solid',
						borderColor: 'primary.main',
						pl: 1.5,
						py: 0.5,
					}}
				>
					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
						<Chip size="small" label={formatEventType(a.event_type)} variant="outlined" />
						<Typography variant="body2" sx={{ fontWeight: 700 }}>
							{a.actor_display || 'System'}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{a.created_at ? new Date(a.created_at).toLocaleString() : ''}
						</Typography>
					</Stack>
					<Typography variant="body2" sx={{ mt: 0.5 }}>
						{a.summary || '—'}
					</Typography>
				</Box>
			))}
		</Stack>
	);
}

function populateFormFromWo(wo) {
	const aircraftId =
		typeof wo?.aircraft === 'object' && wo?.aircraft != null ? wo.aircraft.id : wo?.aircraft ?? '';
	const createdById =
		typeof wo?.created_by === 'object' && wo?.created_by != null ? wo.created_by.id : wo?.created_by ?? '';
	const rawPartIds = Array.isArray(wo?.parts_needed)
		? wo.parts_needed.map((x) => (typeof x === 'object' && x?.id != null ? x.id : x))
		: [];
	return {
		title: wo?.title || '',
		aircraft: aircraftId === '' ? '' : String(aircraftId),
		created_by: createdById === '' ? '' : String(createdById),
		parts_needed: rawPartIds.map(Number),
		description: wo?.description || '',
		status: wo?.status || 'open',
		priority: wo?.priority || 'medium',
		due_by: wo?.due_by || '',
		ata_code: wo?.ATA_code != null && wo?.ATA_code !== '' ? String(wo.ATA_code) : '',
		components_affected: wo?.components_affected || '',
	};
}

export default function WorkOrderHistoryViewer({
	workOrderId,
	open,
	onClose,
	onChanged,
	canUpdate = false,
	canSupervise = false,
	canDelete = false,
	currentUserId = null,
}) {
	const theme = useTheme();
	const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [wo, setWo] = useState(null);
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState(emptyForm);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [refLoading, setRefLoading] = useState(false);
	const [aircraft, setAircraft] = useState([]);
	const [users, setUsers] = useState([]);
	const [allParts, setAllParts] = useState([]);

	const loadDetail = async () => {
		if (!workOrderId) return;
		setLoading(true);
		setError('');
		try {
			const data = await fetchServiceHistoryDetail(workOrderId);
			setWo(data);
			setForm(populateFormFromWo(data));
		} catch (e) {
			setError(e?.message || 'Failed to load work order.');
			setWo(null);
		} finally {
			setLoading(false);
		}
	};

	const loadReferenceData = async () => {
		setRefLoading(true);
		try {
			const [acRes, userRes, partsRes] = await Promise.allSettled([
				fetchCompanyAircrafts(),
				fetchCompanyUsers(),
				fetchParts(),
			]);
			if (acRes.status === 'fulfilled') setAircraft(unwrapList(acRes.value));
			if (userRes.status === 'fulfilled') setUsers(unwrapList(userRes.value));
			if (partsRes.status === 'fulfilled') setAllParts(unwrapList(partsRes.value));
		} finally {
			setRefLoading(false);
		}
	};

	useEffect(() => {
		if (!open || !workOrderId) {
			setWo(null);
			setError('');
			setEditing(false);
			setForm(emptyForm);
			return undefined;
		}
		loadDetail();
		if (canUpdate) loadReferenceData();
		return undefined;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, workOrderId]);

	const aircraftIdSet = useMemo(() => new Set(aircraft.map((a) => a.id)), [aircraft]);

	const companyParts = useMemo(
		() =>
			allParts.filter((p) => {
				const aid = partAircraftId(p);
				return aid != null && aircraftIdSet.has(aid);
			}),
		[allParts, aircraftIdSet]
	);

	const partLabelById = useMemo(() => {
		const m = new Map();
		companyParts.forEach((p) => m.set(p.id, `${p.part_number} — ${p.name}`));
		return m;
	}, [companyParts]);

	const partsForAircraft = useMemo(() => {
		if (!form.aircraft) return [];
		const aid = Number(form.aircraft);
		return companyParts.filter((p) => Number(partAircraftId(p)) === aid);
	}, [companyParts, form.aircraft]);

	const mechanicUsers = useMemo(
		() => users.filter((u) => ['mechanic', 'manager', 'owner'].includes(u?.company_role)),
		[users]
	);

	const parts = Array.isArray(wo?.parts_needed) ? wo.parts_needed : [];

	const startEditing = () => {
		if (wo) setForm(populateFormFromWo(wo));
		setEditing(true);
		setError('');
	};

	const cancelEditing = () => {
		if (wo) setForm(populateFormFromWo(wo));
		setEditing(false);
		setError('');
	};

	const handleSave = async () => {
		if (!wo?.id) return;
		setSaving(true);
		setError('');
		try {
			let payload;
			if (canSupervise) {
				payload = {
					title: form.title,
					aircraft: Number(form.aircraft),
					description: form.description,
					status: form.status,
					priority: form.priority,
					due_by: form.due_by || null,
					parts_needed: (form.parts_needed || []).map(Number),
					ATA_code: form.ata_code ? Number(form.ata_code) : null,
					components_affected: form.components_affected || '',
					created_by: form.created_by ? Number(form.created_by) : null,
				};
			} else {
				payload = {
					status: form.status,
					priority: form.priority,
					due_by: form.due_by || null,
					description: form.description,
					parts_needed: (form.parts_needed || []).map(Number),
				};
			}
			await updateWorkorder(wo.id, payload);
			setEditing(false);
			await loadDetail();
			onChanged?.();
		} catch (e) {
			setError(e?.message || 'Failed to save work order.');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!wo?.id) return;
		setDeleting(true);
		try {
			await deleteWorkorder(wo.id);
			setDeleteOpen(false);
			onChanged?.();
			onClose?.();
		} catch (e) {
			setError(e?.message || 'Failed to delete work order.');
		} finally {
			setDeleting(false);
		}
	};

	const renderViewMode = () => (
		<Stack spacing={2.5}>
			<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
				<Chip size="small" label={formatStatus(wo.status)} color={wo.status === 'closed' ? 'success' : 'warning'} />
				<Chip size="small" label={`Priority: ${wo.priority || 'medium'}`} variant="outlined" />
				{wo.ATA_code != null && wo.ATA_code !== '' ? (
					<Chip size="small" label={`ATA ${wo.ATA_code}`} variant="outlined" />
				) : null}
			</Stack>

			<Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
				<Stack spacing={2} sx={{ flex: 1 }}>
					<Field label="Aircraft" value={aircraftLabel(wo.aircraft)} />
					<Field
						label="Created by"
						value={resolvePersonDisplay(wo.created_by, wo.created_by_name)}
					/>
					<Field
						label="Assigned to"
						value={resolvePersonDisplay(wo.assignee, wo.assignee_name)}
					/>
					<Field label="Due" value={wo.due_by || '—'} />
					<Field label="Created" value={wo.created_at ? new Date(wo.created_at).toLocaleString() : '—'} />
					<Field label="Last updated" value={wo.updated_at ? new Date(wo.updated_at).toLocaleString() : '—'} />
				</Stack>
				<Stack spacing={2} sx={{ flex: 1 }}>
					<Field label="ATA code" value={wo.ATA_code ?? '—'} />
					<Field
						label="Affected systems"
						value={wo.components_affected || '—'}
					/>
					<Field label="Parts (inventory)">
						{parts.length ? (
							<Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
								{parts.map((p) => (
									<Chip
										key={`${p.id}-${p.part_number}`}
										size="small"
										label={`${p.part_number} — ${p.name} (×${p.quantity ?? 1})`}
										variant="outlined"
									/>
								))}
							</Stack>
						) : (
							<Typography variant="body1">—</Typography>
						)}
					</Field>
					{wo.signed_by ? (
						<Field
							label="Signed off by"
							value={`${profileDisplayName(wo.signed_by)}${wo.signature_date ? ` on ${wo.signature_date}` : ''}`}
						/>
					) : null}
				</Stack>
			</Stack>

			<Divider sx={{ my: 1 }} />
			<LaborEntriesPanel
				workOrderId={wo.id}
				canEdit={canUpdate || canSupervise}
				mechanicUsers={mechanicUsers}
				currentUserId={currentUserId}
				onChanged={() => {
					loadDetail();
					onChanged?.();
				}}
			/>

			<Divider />
			<Field label="Description" value={wo.description || '—'} />
			{wo.completion_notes ? <Field label="Completion notes" value={wo.completion_notes} /> : null}

			<Box
				sx={{
					p: 2,
					borderRadius: 2,
					bgcolor: 'action.hover',
					border: '1px solid',
					borderColor: 'divider',
				}}
			>
				<Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
					Edit history
				</Typography>
				<ActivityTimeline items={wo.activities} />
				{wo.last_edited_by ? (
					<Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
						Last change by {wo.last_edited_by}
						{wo.last_edited_at ? ` · ${new Date(wo.last_edited_at).toLocaleString()}` : ''}
					</Typography>
				) : null}
			</Box>
		</Stack>
	);

	const renderEditMode = () => (
		<Stack spacing={2} sx={{ mt: 0.5 }}>
			{refLoading ? (
				<Typography variant="body2" color="text.secondary">Loading form options…</Typography>
			) : null}
			{canSupervise ? (
				<>
					<TextField
						label="Title"
						value={form.title}
						onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
						fullWidth
					/>
					<TextField
						select
						label="Aircraft"
						value={form.aircraft}
						onChange={(e) => {
							const newAc = e.target.value;
							setForm((s) => {
								const aid = newAc === '' ? null : Number(newAc);
								const nextParts = (s.parts_needed || []).filter((pid) => {
									if (aid == null) return false;
									const p = companyParts.find((x) => x.id === Number(pid));
									return p && Number(partAircraftId(p)) === aid;
								});
								return { ...s, aircraft: newAc, parts_needed: nextParts };
							});
						}}
						fullWidth
					>
						{aircraft.map((a) => (
							<MenuItem key={a.id} value={String(a.id)}>
								{a.registration_number} ({a.model})
							</MenuItem>
						))}
					</TextField>
					<TextField
						select
						label="Assigned to"
						value={form.created_by}
						onChange={(e) => setForm((s) => ({ ...s, created_by: e.target.value }))}
						fullWidth
					>
						<MenuItem value="">Unassigned</MenuItem>
						{mechanicUsers.map((u) => (
							<MenuItem key={u.id} value={String(u.id)}>
								{profileDisplayName(u)}
							</MenuItem>
						))}
					</TextField>
					<TextField
						label="ATA code"
						value={form.ata_code}
						onChange={(e) => setForm((s) => ({ ...s, ata_code: e.target.value }))}
						fullWidth
					/>
					<TextField
						label="Affected systems (optional)"
						placeholder="e.g. COM1 radio, left main landing gear"
						value={form.components_affected}
						onChange={(e) => setForm((s) => ({ ...s, components_affected: e.target.value }))}
						fullWidth
					/>
				</>
			) : (
				<Typography variant="body2" color="text.secondary">
					Update status, due date, description, and parts for this assignment.
				</Typography>
			)}
			<TextField
				select
				label="Status"
				value={form.status}
				onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
				fullWidth
			>
				{WORK_ORDER_STATUS_OPTIONS.map((opt) => (
					<MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
				))}
			</TextField>
			<TextField
				select
				label="Priority"
				value={form.priority}
				onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}
				fullWidth
			>
				{WORK_ORDER_PRIORITY_OPTIONS.map((opt) => (
					<MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
				))}
			</TextField>
			<TextField
				type="date"
				label="Due date"
				InputLabelProps={{ shrink: true }}
				value={form.due_by}
				onChange={(e) => setForm((s) => ({ ...s, due_by: e.target.value }))}
				fullWidth
			/>
			<TextField
				select
				label="Parts from inventory"
				SelectProps={{
					multiple: true,
					renderValue: (selected) =>
						(selected || []).length
							? (selected || []).map((id) => partLabelById.get(id) || `#${id}`).join(', ')
							: '—',
				}}
				value={form.parts_needed || []}
				onChange={(e) =>
					setForm((s) => ({
						...s,
						parts_needed:
							typeof e.target.value === 'string'
								? e.target.value.split(',').map(Number)
								: e.target.value,
					}))
				}
				disabled={!form.aircraft}
				helperText={
					!form.aircraft
						? 'Select an aircraft first'
						: 'Linked to your parts catalog for this tail number (quantities tracked separately).'
				}
				fullWidth
			>
				{partsForAircraft.map((p) => (
					<MenuItem key={p.id} value={p.id}>
						{p.part_number} — {p.name}
					</MenuItem>
				))}
			</TextField>
			<TextField
				label="Description"
				multiline
				minRows={3}
				value={form.description}
				onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
				fullWidth
			/>
			<Divider />
			<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
				Edit history
			</Typography>
			<ActivityTimeline items={wo?.activities} />
		</Stack>
	);

	return (
		<>
			<Dialog
				open={open}
				onClose={onClose}
				maxWidth="md"
				fullWidth
				fullScreen={isSmallScreen}
				scroll="paper"
			>
				<DialogTitle sx={{ pb: 1, pr: 6 }}>
					<Typography variant="overline" color="text.secondary">
						Work order #{wo?.id || workOrderId || '—'}
					</Typography>
					<Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.35 }} title={wo?.title || undefined}>
						{editing
							? canSupervise
								? 'Edit work order'
								: 'Update work order'
							: wo
								? workOrderHeadline(wo, 80)
								: 'Loading…'}
					</Typography>
					{!editing && wo && workOrderSourceLabel(wo) ? (
						<Typography variant="caption" color="text.secondary" display="block">
							{workOrderSourceLabel(wo)}
						</Typography>
					) : null}
				</DialogTitle>
				<DialogContent dividers>
					{loading ? (
						<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
							<CircularProgress size={32} />
						</Box>
					) : null}
					{error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
					{wo && !loading ? (editing ? renderEditMode() : renderViewMode()) : null}
				</DialogContent>
				<DialogActions
					sx={{
						px: { xs: 2, sm: 3 },
						py: 2,
						flexDirection: { xs: 'column', sm: 'row' },
						alignItems: { xs: 'stretch', sm: 'center' },
						gap: 1,
					}}
				>
					{editing ? (
						<>
							<Button fullWidth={isSmallScreen} onClick={cancelEditing} disabled={saving}>
								Cancel
							</Button>
							<Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }} />
							<Button
								fullWidth={isSmallScreen}
								variant="contained"
								startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
								onClick={handleSave}
								disabled={saving}
							>
								Save changes
							</Button>
						</>
					) : (
						<>
							<Button fullWidth={isSmallScreen} onClick={onClose}>
								Close
							</Button>
							<Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }} />
							{canUpdate && wo?.id ? (
								<Button
									fullWidth={isSmallScreen}
									variant="contained"
									startIcon={<EditIcon />}
									onClick={startEditing}
								>
									Edit
								</Button>
							) : null}
							{canDelete && wo?.id ? (
								<Button
									fullWidth={isSmallScreen}
									variant="outlined"
									color="error"
									startIcon={<DeleteIcon />}
									onClick={() => setDeleteOpen(true)}
								>
									Delete
								</Button>
							) : null}
						</>
					)}
				</DialogActions>
			</Dialog>

			<DeleteConfirmationDialog
				open={deleteOpen}
				itemType={`work order #${wo?.id}`}
				onCancel={() => setDeleteOpen(false)}
				onConfirm={handleDelete}
				isLoading={deleting}
			/>
		</>
	);
}
