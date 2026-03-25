from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission

from api.models import Profile


class Command(BaseCommand):
    help = (
        "Create/refresh the 'site_admin' group with broad permissions and "
        "assign it to all staff (non-superuser) accounts."
    )

    def handle(self, *args, **options):
        group, created = Group.objects.get_or_create(name="site_admin")
        group.permissions.set(Permission.objects.all())

        assigned = []
        for u in Profile.objects.filter(is_staff=True, is_superuser=False):
            u.groups.add(group)
            assigned.append(u.username)

        self.stdout.write(
            self.style.SUCCESS(
                f"site_admin group {'created' if created else 'updated'}; "
                f"assigned to {len(assigned)} user(s): {', '.join(assigned) if assigned else '—'}"
            )
        )

