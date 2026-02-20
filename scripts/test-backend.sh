#!/usr/bin/env bash
# Quick backend API tests. Run with backend up: poetry run python manage.py runserver
set -e
BASE="${1:-http://localhost:8000/api}"

echo "=== 1. Health check ==="
curl -s -w " (HTTP %{http_code})\n" "$BASE/health/"
curl -s "$BASE/health/" | grep -q '"status"' && echo "OK: health returned status ok" || exit 1

echo ""
echo "=== 2. Login (get JWT) ==="
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}')
HTTP=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')
echo "HTTP $HTTP"
echo "$BODY" | grep -q 'access' && echo "OK: login returned access token" || exit 1

echo ""
echo "=== 3. Protected endpoint (user profile) ==="
TOKEN=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access',''))")
curl -s -w " (HTTP %{http_code})\n" "$BASE/users/me/" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/users/me/" -H "Authorization: Bearer $TOKEN" | grep -q '"username"' && echo "OK: /users/me/ returned user data" || exit 1

echo ""
echo "All backend API checks passed."
