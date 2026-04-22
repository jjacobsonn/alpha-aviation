export const ROLE_DEFAULT_ROUTES = {
  owner: "/management",
  manager: "/management",
  mechanic: "/maintenance",
  pilot: "/pilot-dashboard",
  dispatcher: "/dispatcher-dashboard",
};

export function isPlatformAdmin(user) {
  return Boolean(
    user?.is_superuser ||
      user?.is_staff ||
      user?.isSuperuser ||
      user?.isStaff
  );
}

/** Owner / manager — create & assign work orders, delete maintenance records (supervisor per product spec). */
export function canSuperviseMaintenance(user) {
  if (isPlatformAdmin(user)) return true;
  const r = user?.company_role ?? user?.role;
  return r === "owner" || r === "manager";
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
