# TourneyPro — Local Development Setup

Run the Django API and Vite frontend on your machine. Local dev uses **SQLite** and **`DEBUG=True`** unless you override env vars.

Production deployment is documented in **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## Prerequisites

- Python **3.12+**
- Node.js **18+**
- Git

---

## 1. Clone and create a virtual environment

From the repo root (`Tournament/`):

**PowerShell (Windows):**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

If activation is blocked by execution policy:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**macOS / Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## 2. Backend dependencies and environment

```bash
cd backend
pip install -r requirements.txt
```

Copy the env template and edit for local use:

```bash
# PowerShell
Copy-Item env.example .env

# macOS / Linux
cp env.example .env
```

**Minimum `.env` for local dev** (matches `backend/env.example` defaults):

```env
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
FRONTEND_URL=http://localhost:5173
```

Leave `DATABASE_URL` and `DB_*` **unset** to use SQLite at `backend/db.sqlite3` (see `get_database_config()` in `backend/core/settings.py`).

> **Important:** `DEBUG` defaults to `False` in code when unset. You must set `DEBUG=True` in `backend/.env` for local development.

### Local settings behavior (`DEBUG=True`)

- `ALLOWED_HOSTS` defaults to `localhost,127.0.0.1` if not set.
- `CORS_ALLOW_ALL_ORIGINS = True` — frontend on port 5173 works without extra CORS config.
- Email goes to the **console** when `EMAIL_HOST_USER` is not set (no SMTP required for basic testing).

Apply migrations:

```bash
python manage.py migrate
```

---

## 3. Create the organiser user (Benson)

```bash
python manage.py setup_benson --password 'your-local-password'
```

The command prints the username and password when it finishes. Only **`Benson`** can log in via the API.

To change the password later, run the same command again (it updates the existing user).

**One-liner from repo root (PowerShell):**

```powershell
.\venv\Scripts\Activate.ps1; cd backend; python manage.py setup_benson --password 'your-local-password'
```

---

## 4. Start the backend

```bash
cd backend
python manage.py runserver
```

API available at `http://127.0.0.1:8000/api/`.  
Admin at `http://127.0.0.1:8000/admin/`.

---

## 5. Frontend dependencies and dev server

In a **second terminal**, from the repo root:

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

### API URL in development

With no `VITE_API_BASE_URL` set, `frontend/src/lib/api.ts` auto-detects the API host:

- `localhost` → `http://localhost:8000/api`

To point the local frontend at the **Render backend** instead, create `frontend/.env.local`:

```env
VITE_API_BASE_URL=https://tourneypro-5.onrender.com
```

---

## 6. Log in and smoke-test

1. Open `http://localhost:5173/login`
2. Username: `Benson`
3. Password: whatever you passed to `setup_benson`
4. After login: create a tournament via **Start Hosting**, add teams, generate fixtures

---

## Optional: local PostgreSQL

If you prefer Postgres locally instead of SQLite, set either:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/tourneypro
```

or the `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT` variables documented in `backend/env.example`.

---

## Optional: production-like local test

To mimic production CORS/hosts locally:

```env
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

You will need a valid `SECRET_KEY` in `.env` when `DEBUG=False`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError: No module named 'django'` | Activate `venv` first — prompt should show `(venv)` |
| 400 `DisallowedHost` locally | Set `DEBUG=True` and `ALLOWED_HOSTS=localhost,127.0.0.1` in `backend/.env` |
| Login 403 “Access restricted” | Username must be exactly `Benson` (case-sensitive) |
| Login fails, user missing | Run `python manage.py setup_benson` |
| CORS errors with `DEBUG=False` locally | Set `CORS_ALLOWED_ORIGINS=http://localhost:5173` |
| Frontend cannot reach API | Ensure backend is on port 8000; check browser Network tab |

---

## Quick reference

```bash
# Terminal 1 — backend
cd backend
python manage.py runserver

# Terminal 2 — frontend
cd frontend
npm run dev
```

**Deploy to Render:** see [DEPLOYMENT.md](./DEPLOYMENT.md).
