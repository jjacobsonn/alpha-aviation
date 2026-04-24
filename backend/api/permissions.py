from rest_framework.permissions import BasePermission, SAFE_METHODS


def _is_platform_admin(user):
    return bool(
        user
        and user.is_authenticated
        and (getattr(user, "is_superuser", False) or getattr(user, "is_staff", False))
    )


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

        # Fallback: if the object has a related company through a known relation
        # (e.g., obj.aircraft.company), individual views can implement more
        # specific checks or override this method.
        return True


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

        if getattr(user, "company_role", None) in {"manager", "owner"} or _is_platform_admin(
            user
        ):
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