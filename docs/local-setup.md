# Local Setup

Use these steps after pulling `dev-jj` so frontend and backend connect correctly.

## 1) Frontend env

Create `frontend/.env` from the example:

```bash
cd frontend
cp .env.example .env
```

`REACT_APP_API_URL` should be:

```env
REACT_APP_API_URL=http://127.0.0.1:8000/api
```

## 2) Backend startup

```bash
cd backend
python3 manage.py migrate
python3 manage.py check
python3 manage.py runserver
```

## 3) Frontend startup

```bash
cd frontend
npm install
npm start
```

Open the app at `http://localhost:3000`.

## 4) Quick verification

- Login works from the UI.
- Backend health endpoint responds:

```bash
curl -i http://127.0.0.1:8000/api/health/
```

## Common issue

If login shows "No response received! Please check your connection.":

- confirm backend is running on `127.0.0.1:8000`
- confirm `frontend/.env` uses `http://127.0.0.1:8000/api`
- restart `npm start` after any `.env` change
