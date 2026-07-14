# Secret Key Information

## Production (Render)

**Never commit a production `SECRET_KEY` to the repo.**

1. Generate a fresh key:
   ```bash
   cd backend
   python manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```
2. Set it in **Render → tourneypro-5 → Environment** as `SECRET_KEY=<generated-value>`.
3. Use **Generate Value** in Render if you prefer the dashboard to create one.

The previously documented fallback key was exposed and has been rotated. Check the Render dashboard for the current value.

## Local development

`backend/core/settings.py` uses a local-only fallback when `SECRET_KEY` is unset. For production-like local testing, set `SECRET_KEY` in `backend/.env` (see `backend/env.example`).

## Current status

- No `backend/.env` should be committed (gitignored).
- Production must set `SECRET_KEY` via Render environment variables.
- `DEBUG=False` in production (set in Render).
