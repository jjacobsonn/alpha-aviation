from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import django


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / 'backend'
AUTH_STATE_PATH = ROOT_DIR / '.auth' / 'e2e-user.json'
USERNAME = 'e2e.mechanic'
PASSWORD = 'E2Epass123!'
EMAIL = 'e2e.mechanic@example.com'


def main() -> None:
    sys.path.insert(0, str(BACKEND_DIR))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

    from django.contrib.auth import get_user_model
    from django.core.management import call_command
    from api.models import Company
    from rest_framework_simplejwt.tokens import RefreshToken

    call_command('seed', verbosity=0)

    company = Company.objects.get(name='Gamma Corp')

    user_model = get_user_model()
    user, _ = user_model.objects.get_or_create(
        username=USERNAME,
        defaults={
            'email': EMAIL,
            'first_name': 'E2E',
            'last_name': 'Mechanic',
            'company': company,
            'company_role': 'mechanic',
        },
    )

    user.email = EMAIL
    user.first_name = 'E2E'
    user.last_name = 'Mechanic'
    user.company = company
    user.company_role = 'mechanic'
    user.is_active = True
    user.set_password(PASSWORD)
    user.save()

    refresh = RefreshToken.for_user(user)

    AUTH_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    AUTH_STATE_PATH.write_text(
        json.dumps(
            {
                'cookies': [],
                'origins': [
                    {
                        'origin': 'http://127.0.0.1:3000',
                        'localStorage': [
                            {'name': 'accessToken', 'value': str(refresh.access_token)},
                            {'name': 'refreshToken', 'value': str(refresh)},
                        ],
                    }
                ],
            },
            indent=2,
        ),
        encoding='utf-8',
    )


if __name__ == '__main__':
    main()