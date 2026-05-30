export const COMPANY_ROLE_LABELS = {
	owner: 'Owner',
	manager: 'Manager',
	mechanic: 'Mechanic',
	pilot: 'Pilot',
	dispatcher: 'Dispatcher',
};

/** Human-readable company role (owner, pilot, etc.). */
export function companyRoleLabel(role) {
	if (!role) return '—';
	return COMPANY_ROLE_LABELS[role] || role;
}

/** Platform access for staff/superuser accounts; empty for tenant-only users. */
export function profilePlatformAccessLabel(u) {
	if (!u) return '';
	if (u.is_superuser) return 'Superuser';
	if (u.is_staff) return 'Staff';
	return '';
}

/** Role column on Site Admin: platform access when applicable, else company role. */
export function profileSiteAdminRoleLabel(u) {
	if (!u) return '—';
	const platform = profilePlatformAccessLabel(u);
	if (platform) return platform;
	return companyRoleLabel(u.company_role);
}

/** Profile / company user: first + last name, else username. */
export function profileDisplayName(u) {
	if (!u) return '';
	if (typeof u === 'object' && u.display_name) {
		const dn = String(u.display_name).trim();
		if (dn) return dn;
	}
	const fn = (u.first_name || '').trim();
	const ln = (u.last_name || '').trim();
	const full = `${fn} ${ln}`.trim();
	return full || (u.username || '').trim() || '';
}

/** Prefer API display_name, nested profile, then optional users lookup by id. */
export function resolvePersonDisplay(profileRef, displayName, usersById) {
	if (displayName && String(displayName).trim()) return String(displayName).trim();
	if (profileRef && typeof profileRef === 'object') {
		return profileDisplayName(profileRef) || '—';
	}
	if (profileRef != null && profileRef !== '' && usersById) {
		const u = usersById.get(Number(profileRef));
		return profileDisplayName(u) || '—';
	}
	return '—';
}

/** Labels for who opened vs who is assigned on a work order payload. */
export function workOrderPeopleLabels(wo, usersById) {
	if (!wo || typeof wo !== 'object') return null;
	const openedBy = resolvePersonDisplay(
		wo.created_by,
		wo.created_by_name,
		usersById
	);
	const assignedTo = resolvePersonDisplay(
		wo.assignee,
		wo.assignee_name,
		usersById
	);
	return {
		openedBy,
		assignedTo: assignedTo !== '—' ? assignedTo : openedBy,
	};
}
