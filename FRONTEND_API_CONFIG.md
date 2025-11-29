# Frontend API Configuration for Render Deployment

## ✅ Configuration Complete

The frontend is now configured to use your Render backend.

### Environment File Created

**File:** `frontend/.env.production`

**Content:**
```env
VITE_API_BASE_URL=https://tourneypro-5.onrender.com
```

### How It Works

The frontend's `src/lib/api.ts` uses the `getApiBaseUrl()` function which:

1. **Checks for `VITE_API_BASE_URL` environment variable first** (production)
   - If set, uses that URL and automatically adds `/api` suffix if needed
   - Your Render URL: `https://tourneypro-5.onrender.com`
   - Will resolve to: `https://tourneypro-5.onrender.com/api`

2. **Falls back to auto-detection** (development)
   - If `VITE_API_BASE_URL` is not set
   - Auto-detects based on hostname
   - Localhost → `http://localhost:8000/api`
   - LAN access → `http://{hostname}:8000/api`

### For Production Build

When you build for production:

```bash
cd frontend
npm run build
```

The `.env.production` file will be automatically used, and all API calls will go to:
```
https://tourneypro-5.onrender.com/api
```

### For Development

During development (when running `npm run dev`), if you want to use the Render backend:

**Option 1:** Create `frontend/.env.local` (this overrides `.env.production`):
```env
VITE_API_BASE_URL=https://tourneypro-5.onrender.com
```

**Option 2:** Just leave it unset to use localhost (default behavior)

### Testing the Configuration

After deploying your frontend, you can verify the API is working by:

1. Opening browser DevTools (F12)
2. Go to Console tab
3. Look for `[API]` logs showing the API base URL being used
4. Make an API call and check Network tab to see the request URL

### API Endpoints That Will Work

All these endpoints will now point to your Render backend:

- `/api/tournaments/` → `https://tourneypro-5.onrender.com/api/tournaments/`
- `/api/auth/login/` → `https://tourneypro-5.onrender.com/api/auth/login/`
- `/api/teams/` → `https://tourneypro-5.onrender.com/api/teams/`
- `/api/matches/` → `https://tourneypro-5.onrender.com/api/matches/`
- `/admin/` → `https://tourneypro-5.onrender.com/admin/`

### Important Notes

1. **CORS is already configured** - Your backend `settings.py` has `CORS_ALLOW_ALL_ORIGINS = True`, so your frontend domain will be allowed.

2. **Environment Variable Naming** - Must be prefixed with `VITE_` for Vite to expose it to the frontend code.

3. **File Location** - `.env.production` is in the `frontend/` directory (same level as `package.json`).

4. **Git Ignore** - `.env.production` might be gitignored. You may need to commit it or set it in your deployment platform's environment variables.

