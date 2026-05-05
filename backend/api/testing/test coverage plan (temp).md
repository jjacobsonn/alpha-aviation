# Backend Test Coverage Plan

## Current Coverage Snapshot

### Strengths
- Core model creation and basic behavior are covered across major entities.
- Cross-model company helper methods have baseline integration checks.
- Many API endpoints are smoke-tested for auth and expected status codes.
- Admin registry and basic page loading are tested.
- Seed command populates expected baseline data and relationships.

### Weaknesses
- Serializer behavior is not directly tested.
- Permission classes are not unit-tested.
- Write operations (POST, PATCH, DELETE) are under-tested across viewsets.
- Error paths and validation branches are inconsistent in coverage.
- Inventory-through model behavior is only partially tested.
- Service layer is largely untested.
- Admin tests do not deeply validate custom list/inlines/form wiring.
- No query-count or performance regression guards on heavy list endpoints.

## Priority Targets For Good Full Coverage

## 1. Serializer Tests (Highest)
- Add unit tests for each serializer:
- Profile serializer role-specific fields and invalid field mapping.
- Flight serializer status fields and required fields.
- Inventory serializer structure with InventoryPart relationship.
- Include both serialization and deserialization tests.
- Include invalid payload and type mismatch tests.

## 2. Permission Matrix Tests (Highest)
- Add direct tests for each permission class:
- IsCompanyMember
- HasCompanyRole
- IsOwner
- IsManagerOrOwner
- IsMechanicOrManager
- IsOwnProfileOrManager
- Validate allow/deny for role and authentication combinations.

## 3. Viewset CRUD Integration Tests (Highest)
- For each viewset endpoint, test:
- List success and role restrictions.
- Create valid payload and invalid payload.
- Partial update and full update permission behavior.
- Delete behavior including forbidden cross-role and cross-company attempts.
- Confirm response payload shape, not only status code.

## 4. Company Function Endpoint Edge Cases (High)
- Aircraft availability:
- Missing start_date or end_date
- Invalid datetime format
- start_date after end_date
- Invalid aircraft_id
- Flight calendar:
- Missing dates
- Invalid date formats
- Reversed ranges
- Empty results shape consistency

## 5. Inventory Integration Coverage (High)
- Test complete inventory lifecycle through API:
- Create inventory record for company
- Add InventoryPart rows
- Quantity update and low-stock behavior
- Company-scoped filtering and isolation
- Low-stock endpoint correctness and ordering

## 6. Authentication Integration (High)
- Login success and invalid credentials already exist; expand to:
- Token refresh invalid token handling
- Expired token behavior
- Logout blacklist flow and token reuse rejection
- Verify authenticated profile endpoint across roles

## 7. Model Validation Branches (Medium-High)
- Profile:
- employee_id uniqueness within company
- Role transitions and related Pilot/Mechanic creation
- Flight clean:
- Missing departure/arrival
- Arrival before departure
- Duplicate primary and secondary pilot
- Pilot wrong company
- Pilot missing pilot_info
- Pilot medical clearance expired
- Pilot certification below requirement
- InventoryPart low stock logic boundary values

## 8. Admin Integration Depth (Medium)
- Validate all registered model changelist pages load.
- Validate add/change forms for models with custom admin fields.
- Validate inline configurations resolve valid model fields.
- Validate search and list_display fields do not reference removed attributes.
- Keep admin checks test as a regression guard.

## 9. Seed Command Robustness (Medium)
- Re-run seed command and assert deterministic data counts.
- Verify destructive reset behavior is intentional and stable.
- Validate critical relationships after seed:
- company to users
- inventory to inventory parts
- workorder to parts
- flights to pilots

## 10. Query and Performance Guards (Optional but Valuable)
- Add query-count assertions for heavy list endpoints.
- Ensure select_related and prefetch_related usage prevents N+1 regressions.
- Add tests for sorted and paginated outputs if pagination is enabled later.

## Integration Test Scenarios To Add

## End-to-End Scenario A: Work Order Lifecycle
- Mechanic creates work order.
- Mechanic links required parts.
- Manager views company workorders list.
- Unauthorized role attempts update and is denied.
- Authorized role updates status.
- Verify final state in list endpoint.

## End-to-End Scenario B: Flight Scheduling and Validation
- Owner creates valid flight with certified pilot.
- Attempt overlapping flight with same aircraft and verify rejection.
- Attempt pilot from different company and verify rejection.
- Verify flight appears in company flights and calendar endpoints.

## End-to-End Scenario C: Inventory and Low Stock
- Create company inventory context.
- Add inventory parts with thresholds.
- Update quantities to cross threshold boundary.
- Verify low-stock endpoint reflects transition.
- Verify other-company user cannot access these records.

## End-to-End Scenario D: Auth and Role Gating
- Unauthenticated access gets denied where required.
- Mechanic blocked from owner-only endpoints.
- Owner allowed on manager-owner endpoints.
- Own-profile object permissions validated for non-manager users.

## Suggested Test File Expansion

- test_serializers.py
- test_permissions.py
- test_views_crud.py
- test_views_edge_cases.py
- test_inventory_integration.py
- test_auth_integration.py
- test_admin_integration.py
- test_queries.py

## Coverage Goal Guidance

- Target around 90 percent line coverage in api models, serializers, permissions, views, and admin modules.
- Target high branch coverage for validation-heavy methods.
- Treat status code checks alone as insufficient; include payload schema and side-effect assertions.

## Immediate First Sprint (Best ROI)

- Fix serializer-model mismatch tests first.
- Add permissions matrix tests.
- Add CRUD tests for flights and inventories.
- Add edge-case tests for date parsing endpoints.
- Add low-stock endpoint integration tests.