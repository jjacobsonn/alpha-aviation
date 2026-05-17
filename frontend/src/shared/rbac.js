export const ROLE_DEFAULT_ROUTES = {
  owner: "/management",
  manager: "/management",
  mechanic: "/maintenance",
  pilot: "/pilot-dashboard",
  dispatcher: "/dispatcher-dashboard",
};

// RBAC MVP matrix source for frontend route/menu access.
export const MODULE_ALLOWED_ROLES = {
  fleet: ["owner", "manager", "dispatcher", "mechanic"],
  fleetDetail: ["owner", "manager", "dispatcher", "mechanic"],
  maintenance: ["owner", "manager", "mechanic"],
  workOrders: ["owner", "manager", "dispatcher", "mechanic"],
  parts: ["owner", "manager", "mechanic"],
  // Mechanics: ops modules only — no Pilot / Dispatcher dashboards.
  // Pilots: no full dispatch board (requests/status live on Pilot page).
  dispatcherDashboard: ["owner", "manager", "dispatcher"],
  // Pilots: own dashboard + schedule only — no Fleet/Parts/Maintenance/WO sidebar noise (MVP).
  pilotDashboard: ["owner", "manager", "dispatcher", "pilot"],
  calendar: ["owner", "manager", "dispatcher", "mechanic", "pilot"],
  serviceHistory: ["owner", "manager", "dispatcher", "mechanic"],
  componentHistory: ["owner", "manager", "mechanic"],
  analytics: ["owner", "manager"],
};

export function isPlatformAdmin(user) {
  return Boolean(
    user?.is_superuser ||
      user?.is_staff ||
      user?.isSuperuser ||
      user?.isStaff
  );
}

/** Effective tenant role (respects “view as” when state is passed). */
export function getEffectiveCompanyRole(context) {
  const viewAs = context?.viewAsUser ?? context?.viewAs;
  const user = context?.user ?? context;
  if (viewAs?.role) return viewAs.role;
  return user?.company_role ?? user?.role ?? null;
}

/** MVP: only owners delete work orders/discrepancies; platform admins when not viewing as another role. */
export function canDeleteWorkOrders(context) {
  const viewAs = context?.viewAsUser;
  const user = context?.user ?? context;
  if (isPlatformAdmin(user) && !viewAs) return true;
  return getEffectiveCompanyRole(context) === "owner";
}

/** Owner/manager supervise assignment and operational edits (not delete authority). */
export function canSuperviseMaintenance(userOrContext) {
  const viewAs = userOrContext?.viewAsUser;
  const user = userOrContext?.user ?? userOrContext;
  if (isPlatformAdmin(user) && !viewAs) return true;
  const r = getEffectiveCompanyRole(userOrContext);
  return r === "owner" || r === "manager";
}

/** Service history archive: view for ops roles; edit only supervisors. */
export function canEditServiceHistory(context) {
  return canSuperviseMaintenance(context);
}

export function isMechanicRole(user) {
  const r = user?.company_role ?? user?.role;
  return r === "mechanic";
}

export function getDefaultRouteForUser(user) {
  if (isPlatformAdmin(user)) return "/site-admin";
  const role = user?.company_role || user?.role;
  return ROLE_DEFAULT_ROUTES[role] || "/login";
}

export function hasFrontendLanding(user) {
  return getDefaultRouteForUser(user) !== "/login";
}

export function allowedRolesForModule(moduleName) {
  return MODULE_ALLOWED_ROLES[moduleName] || [];
}
