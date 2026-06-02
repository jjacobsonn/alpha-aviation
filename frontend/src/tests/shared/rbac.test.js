import {
  allowedRolesForModule,
  canDeleteWorkOrders,
  canEditServiceHistory,
  canSuperviseMaintenance,
  canUpdateWorkOrders,
  getDefaultRouteForUser,
  getEffectiveCompanyRole,
  getRoleHomeMenuId,
  hasFrontendLanding,
  isPlatformAdmin,
  sortMenuItemsForRole,
} from "../../shared/rbac";

describe("RBAC role routing", () => {
  test("maps company roles to expected default routes", () => {
    expect(getDefaultRouteForUser({ company_role: "owner" })).toBe("/management");
    expect(getDefaultRouteForUser({ company_role: "manager" })).toBe("/management");
    expect(getDefaultRouteForUser({ company_role: "mechanic" })).toBe("/maintenance");
    expect(getDefaultRouteForUser({ company_role: "pilot" })).toBe("/pilot-dashboard");
    expect(getDefaultRouteForUser({ company_role: "dispatcher" })).toBe(
      "/dispatcher-dashboard"
    );
  });

  test("routes staff/superusers to site admin", () => {
    expect(getDefaultRouteForUser({ is_staff: true })).toBe("/site-admin");
    expect(getDefaultRouteForUser({ is_superuser: true })).toBe("/site-admin");
  });

  test("detects platform admin correctly", () => {
    expect(isPlatformAdmin({ isStaff: true })).toBe(true);
    expect(isPlatformAdmin({ isSuperuser: true })).toBe(true);
    expect(isPlatformAdmin({})).toBe(false);
  });

  test("reports whether account has frontend landing", () => {
    expect(hasFrontendLanding({ company_role: "mechanic" })).toBe(true);
    expect(hasFrontendLanding({ company_role: "unknown" })).toBe(false);
  });

  it("uses view-as role for effective permissions", () => {
    const state = {
      user: { company_role: "owner" },
      viewAsUser: { role: "mechanic" },
    };
    expect(getEffectiveCompanyRole(state)).toBe("mechanic");
    expect(canSuperviseMaintenance(state)).toBe(false);
    expect(canEditServiceHistory(state)).toBe(false);
  });

  it("allows only owner/manager to supervise maintenance", () => {
    expect(canSuperviseMaintenance({ user: { company_role: "manager" } })).toBe(true);
    expect(canSuperviseMaintenance({ user: { company_role: "mechanic" } })).toBe(false);
  });

  it("allows owners and platform admins to delete work orders", () => {
    expect(canDeleteWorkOrders({ user: { company_role: "owner" } })).toBe(true);
    expect(canDeleteWorkOrders({ user: { company_role: "manager" } })).toBe(false);
    expect(canDeleteWorkOrders({ user: { is_staff: true } })).toBe(true);
    expect(
      canDeleteWorkOrders({
        user: { is_staff: true },
        viewAsUser: { role: "mechanic" },
      })
    ).toBe(false);
  });

  it("allows maintenance roles to update work orders", () => {
    expect(canUpdateWorkOrders({ user: { company_role: "mechanic" } })).toBe(true);
    expect(canUpdateWorkOrders({ user: { company_role: "dispatcher" } })).toBe(true);
    expect(canUpdateWorkOrders({ user: { company_role: "manager" } })).toBe(true);
    expect(canUpdateWorkOrders({ user: { company_role: "pilot" } })).toBe(false);
  });

  it("pins site admin first for platform admins", () => {
    expect(getRoleHomeMenuId({ user: { is_staff: true } })).toBe("site-admin");
    const items = [
      { id: "management", title: "Management" },
      { id: "site-admin", title: "Site Admin" },
      { id: "fleet", title: "Fleet" },
    ];
    const sorted = sortMenuItemsForRole(items, { user: { is_staff: true } });
    expect(sorted[0].id).toBe("site-admin");
  });

  it("pins the role home menu item first", () => {
    expect(getRoleHomeMenuId({ user: { company_role: "dispatcher" } })).toBe(
      "dispatcher-dashboard"
    );
    const items = [
      { id: "fleet", title: "Fleet" },
      { id: "dispatcher-dashboard", title: "Dispatcher" },
      { id: "calendar", title: "Calendar" },
    ];
    const sorted = sortMenuItemsForRole(items, { user: { company_role: "dispatcher" } });
    expect(sorted.map((i) => i.id)).toEqual([
      "dispatcher-dashboard",
      "fleet",
      "calendar",
    ]);
  });

  it("does not allow dispatchers on pilot dashboard", () => {
    expect(allowedRolesForModule("pilotDashboard")).not.toContain("dispatcher");
    expect(allowedRolesForModule("pilotDashboard")).toContain("pilot");
  });
});
