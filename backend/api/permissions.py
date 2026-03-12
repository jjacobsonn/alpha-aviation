from rest_framework.permissions import BasePermission


class IsMechanicOrManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_mechanic() or
            request.user.is_manager() or
            request.user.is_owner()
        )


class IsManagerOrOwner(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_manager() or
            request.user.is_owner()
        )


class IsOwner(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_owner()


class IsOwnProfileOrManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return (
            obj == request.user or
            request.user.is_manager() or
            request.user.is_owner()
        )

