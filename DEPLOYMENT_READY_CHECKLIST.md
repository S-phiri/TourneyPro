# Deployment Ready Checklist ✅

## Code Cleanup Completed

### ✅ Backend (`backend/core/settings.py`)
- **CORS**: Simplified to `CORS_ALLOW_ALL_ORIGINS = True` (open for today)
- **CSRF**: Simplified, uses `FRONTEND_URL` env var if set
- **ALLOWED_HOSTS**: Already set to `["*"]` for flexibility
- **SQLite**: Left as-is for simplicity (can upgrade to PostgreSQL later)

### ✅ Frontend API Configuration
- **Centralized API Base URL**: All code uses `getApiBaseUrl()` function
- **Environment Variable Priority**: `VITE_API_BASE_URL` is checked first (production)
- **Development Fallback**: Auto-detects from hostname for local development
- **Files Updated**:
  - `frontend/src/lib/api.ts` - Main API base URL function
  - `frontend/src/lib/auth.ts` - Uses shared function
  - `frontend/src/pages/SignUp.tsx` - Uses shared function

### ✅ No Hardcoded URLs
- Removed hardcoded `192.168.1.80` references
- `localhost:8000` only appears as development fallback (acceptable)

## Deployment Configuration

### Environment Variables to Set

#### Backend (`.env` file in `backend/` directory)
```env
SECRET_KEY=your-generated-secret-key-here
DEBUG=False
ALLOWED_HOSTS=*
FRONTEND_URL=https://yourdomain.com  # Optional, for CSRF
```

#### Frontend (`.env.production` file in `frontend/` directory)
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### Production Checklist

- [ ] Backend environment variables configured
- [ ] Frontend environment variable `VITE_API_BASE_URL` set
- [ ] Database migrations run (`python manage.py migrate`)
- [ ] Static files collected (`python manage.py collectstatic`)
- [ ] Frontend built (`npm run build` in `frontend/` directory)
- [ ] SSL/HTTPS configured
- [ ] Organiser user (Benson) credentials verified

## How It Works

### API Base URL Resolution (Priority Order)
1. **Production**: `VITE_API_BASE_URL` environment variable (set in build)
2. **Development**: Auto-detects from `window.location.hostname`
   - `localhost` → `http://localhost:8000/api`
   - Other hostnames → `http://{hostname}:8000/api`

### CORS Configuration
- **Today**: `CORS_ALLOW_ALL_ORIGINS = True` (simplified for deployment)
- **Future**: Can restrict to specific domains if needed

## Ready for Deployment! 🚀

The codebase is now deployment-ready with:
- ✅ Simplified CORS (open for today)
- ✅ Environment-based API URLs
- ✅ No hardcoded localhost/IP addresses
- ✅ Centralized API configuration
- ✅ SQLite database (simple for today)

