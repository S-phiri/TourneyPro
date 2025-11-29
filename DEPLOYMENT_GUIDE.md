# Tournament Management System - Deployment Guide

## Quick Start (10 Hours to Production)

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL (for production)
- Domain name (optional, can use platform subdomain)

### Step 1: Backend Setup (2-3 hours)

#### 1.1 Install Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 1.2 Configure Environment Variables
Create `backend/.env` file:
```env
SECRET_KEY=your-secret-key-here-generate-with-django-secret-key-generator
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database (PostgreSQL)
DB_NAME=tournament_db
DB_USER=tournament_user
DB_PASSWORD=your-secure-password
DB_HOST=localhost
DB_PORT=5432

# Email (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password  # Gmail App Password, not regular password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Security (Production)
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

#### 1.3 Database Setup
```bash
# Create PostgreSQL database
createdb tournament_db

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser
```

#### 1.4 Collect Static Files
```bash
python manage.py collectstatic --noinput
```

### Step 2: Frontend Setup (1-2 hours)

#### 2.1 Install Dependencies
```bash
cd frontend
npm install
```

#### 2.2 Configure Environment
Create `frontend/.env` file:
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

#### 2.3 Build for Production
```bash
npm run build
```

### Step 3: Deploy to Platform (2-3 hours)

#### Option A: Railway.app (Recommended - Easiest)

1. **Create Account**: Sign up at railway.app
2. **Create New Project**: Click "New Project"
3. **Add PostgreSQL**: Add PostgreSQL service
4. **Deploy Backend**:
   - Connect GitHub repo
   - Select `backend/` directory
   - Set environment variables
   - Railway auto-detects Django
5. **Deploy Frontend**:
   - Add new service
   - Select `frontend/` directory
   - Build command: `npm run build`
   - Start command: `npx serve -s dist`
   - Or use Vite preview: `npm run preview`

#### Option B: Render.com

1. **Create Account**: Sign up at render.com
2. **Deploy Backend**:
   - New → Web Service
   - Connect repo
   - Root directory: `backend`
   - Build: `pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput`
   - Start: `gunicorn core.wsgi:application`
3. **Deploy Frontend**:
   - New → Static Site
   - Root directory: `frontend`
   - Build: `npm install && npm run build`
   - Publish: `dist`

#### Option C: DigitalOcean App Platform

1. **Create App**: New App → GitHub
2. **Add Backend Component**:
   - Type: Web Service
   - Source: `backend/`
   - Build: `pip install -r requirements.txt`
   - Run: `gunicorn core.wsgi:application`
3. **Add Frontend Component**:
   - Type: Static Site
   - Source: `frontend/`
   - Build: `npm install && npm run build`
   - Output: `dist`

### Step 4: Configure Domain & SSL (1 hour)

1. **Add Domain**: In platform dashboard, add your domain
2. **DNS Configuration**: Point domain to platform
3. **SSL**: Platform auto-generates SSL certificate
4. **Update CORS**: Update `FRONTEND_URL` and `ALLOWED_HOSTS` in backend

### Step 5: Testing (1-2 hours)

1. **Test Registration**: Create account
2. **Test Tournament Creation**: Create a test tournament
3. **Test Team Registration**: Register teams
4. **Test Fixture Generation**: Generate fixtures
5. **Test Simulation**: Simulate rounds
6. **Test Email**: Verify emails are sent

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Static files collected
- [ ] SSL certificate active
- [ ] CORS configured correctly
- [ ] Email sending works
- [ ] Error logging set up
- [ ] Database backups configured
- [ ] Monitoring set up (optional)

## Troubleshooting

### Authentication Errors
- Check JWT token expiration
- Verify `SECRET_KEY` is set correctly
- Check CORS settings

### Database Errors
- Verify PostgreSQL connection
- Check migrations are applied
- Verify database user permissions

### Email Not Sending
- Check Gmail App Password (not regular password)
- Verify SMTP settings
- Check spam folder

### Frontend Not Loading
- Verify `VITE_API_BASE_URL` is correct
- Check CORS allows frontend domain
- Verify build completed successfully

## Security Notes

1. **Never commit `.env` files**
2. **Use strong `SECRET_KEY`** (generate with Django)
3. **Enable HTTPS** in production
4. **Use PostgreSQL** in production (not SQLite)
5. **Set `DEBUG=False`** in production
6. **Use App Passwords** for Gmail (not regular passwords)

## Support

For issues, check:
- Backend logs in platform dashboard
- Browser console for frontend errors
- Django admin at `/admin/` for data verification

