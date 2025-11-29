# Render Backend Deployment - Quick Reference

## 🚀 Deployment Steps

### 1. Create Service on Render
- Go to **render.com** → **Dashboard** → **New +** → **Web Service**
- Connect your GitHub repository
- Select your repository

### 2. Configure Service

#### Basic Settings
- **Name**: `tournament-backend` (or your choice)
- **Root Directory**: `backend` (important!)
- **Runtime**: `Python 3`
- **Build Command**: 
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**: 
  ```bash
  gunicorn core.wsgi:application
  ```
  OR for quick testing:
  ```bash
  python manage.py runserver 0.0.0.0:$PORT
  ```

### 3. Environment Variables
Add these in **Render → Environment**:

```env
SECRET_KEY=django-insecure-5vtg5y*rze$8c)jqfm55_08&da#f__5q*wys(g^azmc^b-ults
DEBUG=False
PYTHON_VERSION=3.12
```

**Note:** 
- `ALLOWED_HOSTS` is already set to `["*"]` in code
- Render automatically sets `PORT` environment variable

### 4. Build & Deploy Settings

#### Advanced Settings (if needed):
- **Auto-Deploy**: `Yes` (deploys on every push to main)
- **Health Check Path**: `/api/tournaments/` (optional)

### 5. Post-Deployment Setup

Once Render builds and deploys, you'll get a URL like:
```
https://tournament-backend.onrender.com
```

#### Run Migrations & Create Superuser
1. Open **Render Dashboard** → Your Service → **Shell**
2. Or use Render CLI: `render shell`
3. Run:
```bash
python manage.py migrate
python manage.py setup_benson
```

#### Verify Backend is Live
1. Test admin: `https://your-app.onrender.com/admin/`
2. Test API: `https://your-app.onrender.com/api/tournaments/`

### 6. Static Files (Optional for Today)
Render handles static files automatically. If needed:
```bash
python manage.py collectstatic --noinput
```

## 📋 Quick Checklist

- [ ] Service created on Render
- [ ] Connected GitHub repository
- [ ] Set **Root Directory** to `backend`
- [ ] Set **Build Command**: `pip install -r requirements.txt`
- [ ] Set **Start Command**: `gunicorn core.wsgi:application` (or `python manage.py runserver 0.0.0.0:$PORT`)
- [ ] Added `SECRET_KEY` environment variable
- [ ] Added `DEBUG=False` environment variable
- [ ] Added `PYTHON_VERSION=3.12` (or your Python version)
- [ ] Ran migrations: `python manage.py migrate`
- [ ] Created superuser or ran `setup_benson`
- [ ] Verified admin panel: `/admin/`
- [ ] Verified API: `/api/tournaments/`
- [ ] Copied Render backend URL for frontend configuration

## 🔧 Render-Specific Notes

### Start Command Options

**Option 1: Gunicorn (Recommended for Production)**
```bash
gunicorn core.wsgi:application
```

**Option 2: Django Dev Server (Simpler for today)**
```bash
python manage.py runserver 0.0.0.0:$PORT
```

### Requirements.txt
- Already exists at `backend/requirements.txt`
- Includes all necessary packages including `gunicorn`
- Render will automatically install dependencies

### Database
- Can use SQLite for now (already configured)
- Or add PostgreSQL addon later if needed

## 🔗 Next: Frontend Deployment on Render

After backend is live, deploy frontend:

1. **New** → **Static Site**
2. Root Directory: `frontend`
3. Build Command: `npm install && npm run build`
4. Publish Directory: `dist`
5. Environment Variable: `VITE_API_BASE_URL=https://your-backend.onrender.com/api`

## 🆚 Differences from Railway

| Feature | Railway | Render |
|---------|---------|--------|
| Start Command | `python manage.py runserver 0.0.0.0:$PORT` | `gunicorn core.wsgi:application` |
| Root Directory | Set in service config | Set in service config |
| Build Command | Auto-detected | `pip install -r requirements.txt` |
| Static Files | Auto-handled | Auto-handled |

## 📝 Important Render Settings Summary

```
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: gunicorn core.wsgi:application
Environment Variables:
  - SECRET_KEY=your-key
  - DEBUG=False
  - PYTHON_VERSION=3.12
```

