import {
  getDefaultRouteForUser,
  hasFrontendLanding,
  isPlatformAdmin,
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
});
