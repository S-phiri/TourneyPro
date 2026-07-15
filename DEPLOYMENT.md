# TourneyPro — Deployment (Render)

Production deployment for TourneyPro uses **Render** with PostgreSQL. The repo root `render.yaml` is the source of truth for service names, build commands, and environment variables.

## Architecture

| Resource | Name | Type |
|----------|------|------|
| Backend API | `tourneypro-5` | Python web service (`backend/`) |
| Frontend | `tourneypro-frontend` | Static site (`frontend/`) |
| Database | `tourneypro-db` | Managed PostgreSQL |

**URLs (after deploy):**

- Backend: `https://tourneypro-5.onrender.com`
- Frontend: `https://tourneypro-frontend.onrender.com` (or your custom static-site URL)
- API base (resolved by frontend): `https://tourneypro-5.onrender.com/api`

---

## Blueprint vs existing manual services

### Option A — Adopt the Blueprint (new stack)

1. In Render: **New → Blueprint** → connect this repo.
2. Render reads `render.yaml` and provisions `tourneypro-5`, `tourneypro-frontend`, and `tourneypro-db`.
3. When prompted, set the `sync: false` environment variables (see table below).

### Option B — Existing manual `tourneypro-5` service

If `tourneypro-5` already exists outside the Blueprint, align it with `render.yaml`:

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Runtime | Python 3.12 |
| Build Command | `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate --noinput` |
| Start Command | `gunicorn core.wsgi:application --bind 0.0.0.0:$PORT` |

Link a Render PostgreSQL instance and set `DATABASE_URL` from the database connection string. Create `tourneypro-frontend` as a separate static site if it does not exist yet.

---

## Environment variables

### Backend (`tourneypro-5`)

| Variable | Set by | Required in production | Notes |
|----------|--------|------------------------|-------|
| `PYTHON_VERSION` | `render.yaml` | Yes | `3.12` |
| `DATABASE_URL` | Linked Postgres (`tourneypro-db`) | Yes | Uses PostgreSQL with `sslmode=require` |
| `SECRET_KEY` | `render.yaml` (`generateValue: true`) or dashboard | Yes | Never commit production values. Rotate via Render dashboard if exposed. |
| `DEBUG` | `render.yaml` | Yes | Must be `False` |
| `ALLOWED_HOSTS` | You (dashboard) | **Yes** | Comma-separated hostnames, e.g. `tourneypro-5.onrender.com` |
| `FRONTEND_URL` | You (dashboard) | **Yes** | Frontend origin, e.g. `https://tourneypro-frontend.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | You (dashboard) | Recommended | Comma-separated origins allowed to call the API. If unset, `FRONTEND_URL` is used. |

**Production behavior (`DEBUG=False` in `backend/core/settings.py`):**

- `ALLOWED_HOSTS` is read from the environment with **no wildcard default**. If unset, Django rejects requests.
- `CORS_ALLOW_ALL_ORIGINS` is `False`. You must set `CORS_ALLOWED_ORIGINS` and/or `FRONTEND_URL`.
- `CSRF_TRUSTED_ORIGINS` defaults to the same values as CORS origins.
- Secure session/CSRF cookies are enabled.

**Optional email (SMTP):** see `backend/env.example` for `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, etc.

#### Example backend env (adjust URLs to your actual frontend hostname)

```env
DEBUG=False
ALLOWED_HOSTS=tourneypro-5.onrender.com
FRONTEND_URL=https://tourneypro-frontend.onrender.com
CORS_ALLOWED_ORIGINS=https://tourneypro-frontend.onrender.com
```

`SECRET_KEY` and `DATABASE_URL` are managed by Render (generated / injected from the linked database).

### Frontend (`tourneypro-frontend`)

| Variable | Required | Value |
|----------|----------|-------|
| `VITE_API_BASE_URL` | Yes | `https://tourneypro-5.onrender.com` |

Do **not** append `/api` — `frontend/src/lib/api.ts` adds it automatically.

The repo tracks `frontend/.env.production` with this value for local production builds. On Render, set the same variable in the static site environment so builds pick it up.

---

## Build and start commands (from `render.yaml`)

### Backend

```bash
# Build
pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate --noinput

# Start
gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

Migrations run on every deploy. Static files are served via WhiteNoise (`whitenoise` in `requirements.txt`, middleware in `settings.py`).

### Frontend

```bash
# Build
npm install && npm run build

# Publish directory
dist
```

---

## Post-deploy setup

### 1. Create the organiser user

Migrations may create a legacy `Phiri` superuser from an old migration — **do not use that password**. Create or update the organiser account explicitly:

```bash
# Render Dashboard → tourneypro-5 → Shell
python manage.py setup_benson --password 'choose-a-strong-password'
```

Only the username **`Benson`** can log in via the API (`RestrictedTokenObtainPairView`).

### 2. Verify backend

| Check | URL |
|-------|-----|
| API list | `https://tourneypro-5.onrender.com/api/tournaments/` |
| Admin (styled) | `https://tourneypro-5.onrender.com/admin/` |

### 3. Verify frontend

1. Open the static site URL.
2. In browser DevTools → Network, confirm API calls go to `https://tourneypro-5.onrender.com/api/...`.
3. Log in at `/login` with `Benson` and the password you set via `setup_benson`.

---

## SECRET_KEY rotation

If a key was ever committed or documented:

1. Render → `tourneypro-5` → **Environment** → regenerate or paste a new `SECRET_KEY`.
   ```bash
   cd backend
   python manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```
2. Save and redeploy. Existing JWTs signed with the old key will stop working (users re-login).

---

## Troubleshooting

### `DisallowedHost` / 400 Bad Request

`ALLOWED_HOSTS` is missing or wrong. Set it to your backend hostname (e.g. `tourneypro-5.onrender.com`).

### CORS errors in the browser

With `DEBUG=False`, open CORS is disabled. Set `CORS_ALLOWED_ORIGINS` to your frontend URL (scheme + host, no trailing path). `FRONTEND_URL` alone is sufficient if you are not using multiple origins.

### Database connection errors

- Confirm `tourneypro-db` is linked and `DATABASE_URL` is present on `tourneypro-5`.
- Production always uses PostgreSQL when `DATABASE_URL` is set; SQLite is local-dev only.

### Admin loads without CSS

Ensure `collectstatic` runs in the build command and WhiteNoise middleware is active (already configured in `settings.py`).

### Login returns 403 “Access restricted”

Only `Benson` may log in. Run `setup_benson` if the user does not exist.

### Frontend hits wrong API

Confirm `VITE_API_BASE_URL=https://tourneypro-5.onrender.com` on the static site and rebuild.

---

## Security checklist

- [ ] `DEBUG=False` on Render
- [ ] `SECRET_KEY` set only in Render (not in git)
- [ ] `ALLOWED_HOSTS` lists real backend hostnames
- [ ] `CORS_ALLOWED_ORIGINS` / `FRONTEND_URL` lists real frontend origin(s)
- [ ] PostgreSQL linked (`DATABASE_URL` injected)
- [ ] `setup_benson` run with a strong `--password`
- [ ] SMTP credentials in Render env if email is required (optional)

---

## Local development

See **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** for running the stack on your machine with SQLite and `DEBUG=True`.
