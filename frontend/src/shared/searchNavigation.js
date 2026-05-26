import { allowedRolesForModule } from './rbac';

/** Maps global search result types to in-app routes (deep links where supported). */
export function pathForSearchResult(item, role) {
	if (!item?.type || item.id == null) return null;
	switch (item.type) {
		case 'aircraft':
			return `/fleet/${item.id}`;
		case 'work_order':
			return `/maintenance?wo=${item.id}`;
		case 'discrepancy':
			if (role === 'pilot') return `/pilot-dashboard?disc=${item.id}`;
			return `/maintenance?disc=${item.id}`;
		case 'part':
			return '/parts';
		case 'flight':
			return `/calendar?flight=${item.id}`;
		default:
			return null;
	}
}

const TYPE_MODULE = {
	aircraft: 'fleet',
	work_order: 'workOrders',
	discrepancy: 'maintenance',
	part: 'parts',
	flight: 'calendar',
};

function moduleForResultType(type, role) {
	if (type === 'discrepancy' && role === 'pilot') return 'pilotDashboard';
	return TYPE_MODULE[type];
}

/** Client-side guard: hide result rows the current role cannot access (defense in depth). */
export function filterSearchGroupsForRole(groups, role, { platformAdmin = false } = {}) {
	if (platformAdmin) return groups || [];
	if (!role) return [];
	return (groups || [])
		.map((group) => {
			const items = (group.items || []).filter((item) => {
				const moduleName = moduleForResultType(item.type, role);
				if (!moduleName) return true;
				return allowedRolesForModule(moduleName).includes(role);
			});
			return items.length ? { ...group, items } : null;
		})
		.filter(Boolean);
}

export const SEARCH_GROUP_ICONS = {
	aircraft: 'aircraft',
	work_orders: 'work_orders',
	discrepancies: 'discrepancies',
	parts: 'parts',
	flights: 'flights',
};
