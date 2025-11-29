# Railway Backend Deployment - Quick Reference

## 🚀 Deployment Steps

### 1. Create Project on Railway
- Go to **Railway.app** → **New Project** → **Deploy from GitHub**
- Select your repository
- Choose folder: **`backend/`** (where `manage.py` is located)

### 2. Environment Variables
Add these in **Railway → Service → Variables**:

```env
SECRET_KEY=your-django-secret-key-from-env-or-settings
DEBUG=False
```

**Note:** `ALLOWED_HOSTS` is already set to `["*"]` in code, so no env var needed.

### 3. Start Command
In **Railway → Service → Settings → Start Command**, set:

```bash
python manage.py runserver 0.0.0.0:$PORT
```

*(Fine for one-day tournament. For production later, use `gunicorn`)*

### 4. Post-Deployment Setup

Once Railway builds and starts, you'll get a public URL like:
```
https://your-tournament-app.up.railway.app
```

#### Run Migrations & Create Superuser
Open **Railway → Service → Shell** (or use Railway CLI) and run:

```bash
python manage.py migrate
python manage.py createsuperuser
# Follow prompts to create your organiser user (or use your existing setup_benson command)
python manage.py setup_benson  # If you want to use the management command
```

#### Verify Backend is Live
1. Test admin panel: `https://your-tournament-app.up.railway.app/admin/`
2. Try logging in with your superuser credentials
3. Test API endpoint: `https://your-tournament-app.up.railway.app/api/tournaments/`

## 📋 Quick Checklist

- [ ] Project created on Railway
- [ ] Connected GitHub repository
- [ ] Selected `backend/` folder
- [ ] Added `SECRET_KEY` environment variable
- [ ] Added `DEBUG=False` environment variable
- [ ] Set start command: `python manage.py runserver 0.0.0.0:$PORT`
- [ ] Ran migrations: `python manage.py migrate`
- [ ] Created superuser or ran `setup_benson`
- [ ] Verified admin panel works: `/admin/`
- [ ] Verified API works: `/api/tournaments/`
- [ ] Copied Railway backend URL for frontend configuration

## 🔗 Next: Frontend Deployment

After backend is live, update frontend `.env.production`:

```env
VITE_API_BASE_URL=https://your-tournament-app.up.railway.app/api
```

Then deploy frontend to Railway as a static site or separate service.

