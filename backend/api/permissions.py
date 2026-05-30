from rest_framework.permissions import BasePermission, SAFE_METHODS


def _is_platform_admin(user):
    return bool(
        user
        and user.is_authenticated
        and (getattr(user, "is_superuser", False) or getattr(user, "is_staff", False))
    )


def _company_for_object(obj):
    """Resolve tenant company from an object or common relations (aircraft, inventory)."""
    direct = getattr(obj, "company", None)
    if direct is not None:
        return direct
    aircraft = getattr(obj, "aircraft", None)
    if aircraft is not None:
        return getattr(aircraft, "company", None)
    inventory = getattr(obj, "inventory", None)
    if inventory is not None:
        return getattr(inventory, "company", None)
    return None


class IsPlatformAdmin(BasePermission):
    """Staff/superuser only — global company admin, site-admin flows."""

    def has_permission(self, request, view):
        return _is_platform_admin(getattr(request, "user", None))


class IsCompanyMember(BasePermission):
    """
    Allows access only to authenticated users that belong to a company.
    """

    def has_permission(self, request, view):
        user = request.user
        if _is_platform_admin(user):
            return True
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "company", None) is not None
        )

    def has_object_permission(self, request, view, obj):
        user = request.user

        # If the object has a direct company attribute, compare it.
        obj_company = getattr(obj, "company", None)
        if obj_company is not None:
            return obj_company == getattr(user, "company", None)

        if _is_platform_admin(user):
            return True

        obj_company = _company_for_object(obj)
        user_company = getattr(user, "company", None)
        if obj_company is None or user_company is None:
            return False
        return obj_company == user_company


class HasCompanyRole(BasePermission):
    """
    Generic role-based permission.

    Usage:
        class SomeView(APIView):
            permission_classes = [IsAuthenticated, IsCompanyMember, HasCompanyRole(["mechanic", "manager"])]
    """

    def __init__(self, allowed_roles=None):
        # DRF instantiates permission classes without args; allowed roles
        # should be set via the view attribute `allowed_roles` when needed.
        self.allowed_roles = allowed_roles or []

    def has_permission(self, request, view):
        user = request.user
        allowed = getattr(view, "allowed_roles", self.allowed_roles)

        if not (user and user.is_authenticated):
            return False
        if _is_platform_admin(user):
            return True

        if not allowed:
            # If no roles specified, treat as "no additional restriction"
            return True

        return getattr(user, "company_role", None) in allowed


class ReadOnly(BasePermission):
    """
    Allows read-only access for any authenticated user.
    """

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS


class IsOwner(BasePermission):
    """
    Allow access only to users with company_role = 'owner'.
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(
            (user and user.is_authenticated and user.company_role == "owner")
            or _is_platform_admin(user)
        )


class IsManagerOrOwner(BasePermission):
    """
    Allow access to manager or owner roles.
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                getattr(user, "company_role", None) in {"manager", "owner"}
                or _is_platform_admin(user)
            )
        )


class IsMechanicOrManager(BasePermission):
    """
    Allow access to mechanic, manager, or owner roles.
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                getattr(user, "company_role", None)
                in {"mechanic", "manager", "owner"}
                or _is_platform_admin(user)
            )
        )


class IsComponentHistoryReader(BasePermission):
    """
    Component history: read for owner/manager/mechanic; register (POST) for same roles
    plus platform admins. Dispatchers are excluded (MVP matrix).
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role = getattr(user, "company_role", None)
        allowed = role in {"owner", "manager", "mechanic"} or _is_platform_admin(user)
        if request.method in ("GET", "HEAD", "OPTIONS", "POST"):
            return allowed
        return False


class IsServiceHistoryReader(BasePermission):
    """
    Read-only access to service history (work order archive search).
    """

    def has_permission(self, request, view):
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            return False
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                getattr(user, "company_role", None)
                in {"owner", "manager", "mechanic", "dispatcher"}
                or _is_platform_admin(user)
            )
        )


class IsMechanicOrManagerOrPilot(BasePermission):
    """
    Same as IsMechanicOrManager, plus pilot (e.g. list own discrepancy reports).
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                getattr(user, "company_role", None)
                in {"mechanic", "manager", "owner", "pilot"}
                or _is_platform_admin(user)
            )
        )


class IsOwnProfileOrManager(BasePermission):
    """
    Allow a user to access their own Profile, or any Profile if manager/owner.
    Expects `Profile` instances as objects.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if _is_platform_admin(user):
            return True

        obj_company = getattr(obj, "company", None)
        user_company = getattr(user, "company", None)
        if obj_company is None or user_company is None or obj_company != user_company:
            return False

        if getattr(user, "company_role", None) in {"manager", "owner"}:
            return True

        return getattr(obj, "id", None) == getattr(user, "id", None)

class CanReportDiscrepancy(BasePermission):

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated)

class CanSignWorkOrder(BasePermission):

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        role = getattr(user, "company_role", None)
        if role in {"manager", "owner"}:
            return True
        if role == "mechanic":
            return hasattr(user, "mechanic_info") and user.mechanic_info.inspector_authentication
        return False