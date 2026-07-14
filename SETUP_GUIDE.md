# Setup Guide for Single Organiser Mode

## ✅ Completed Features

1. **Management Command Created**: `backend/tournaments/management/commands/setup_benson.py`
2. **Login Restriction**: Only "Benson" can log in
3. **Team Addition Modal**: Beautiful form UI instead of prompt
4. **Frontend Integration**: All UI components updated

## ⚠️ Critical: Restore views.py File

The `backend/tournaments/views.py` file needs to be restored. It currently only contains `RestrictedTokenObtainPairView` but needs all these classes:

- `RestrictedTokenObtainPairView` ✅ (already there)
- `RegisterView`
- `RegisterManagerView`
- `UserView`
- `VenueViewSet`
- `TournamentViewSet`
- `TeamViewSet`
- `RegistrationViewSet`
- `MatchViewSet`
- `PlayerViewSet`
- `TeamPlayerViewSet`

**Action Required**: Restore `backend/tournaments/views.py` from your version control or backup, then add the `RestrictedTokenObtainPairView` class to it (it's already in the current file).

## 🚀 Setup Steps

### Step 1: Restore views.py
Restore the complete `backend/tournaments/views.py` file. The `RestrictedTokenObtainPairView` class should be added after imports and before `RegisterView`.

### Step 2: Create Benson User
```bash
cd backend
python manage.py setup_benson
```

### Step 3: Test Login
1. Go to `http://localhost:5173/login`
2. Login with credentials from `python manage.py setup_benson`

### Step 4: Create Tournament
1. After logging in, click "Start Hosting"
2. Fill in tournament details
3. Save

### Step 5: Add Teams
1. Go to tournament detail page
2. Click "Add Team" button (organiser-only)
3. Fill in the form:
   - Team Name (required)
   - Manager Name (optional)
   - Manager Email (optional)
4. Click "Add Team"

## 📝 Workflow Summary

1. **Benson logs in** → Only "Benson" username works
2. **Creates tournament** → Via "Start Hosting" page
3. **Adds teams** → Via "Add Team" button/modal on tournament page
4. **Manages tournament** → All organiser features available

## 🔒 Security

- Only "Benson" can log in (enforced in `RestrictedTokenObtainPairView`)
- Only users with `is_staff=True` can create/edit tournaments
- All write operations require organiser authentication
- Read operations are public (`AllowAny`)

## 🎨 UI Improvements

- **Add Team Modal**: Replaced prompt with beautiful form modal
- **Organiser-only UI**: Edit buttons only visible to organisers
- **Clean Sheets Award**: Now shows team instead of goalkeeper

## 📁 Files Modified

### Backend
- `backend/tournaments/management/commands/setup_benson.py` (NEW)
- `backend/tournaments/views.py` (needs restoration + RestrictedTokenObtainPairView)
- `backend/core/urls.py` (updated to use RestrictedTokenObtainPairView)
- `backend/tournaments/permissions.py` (IsOrganiser class)
- `backend/tournaments/awards.py` (clean sheets for teams)

### Frontend
- `frontend/src/components/tournament/AddTeamModal.tsx` (NEW)
- `frontend/src/pages/TournamentDetail.tsx` (modal integration)
- `frontend/src/context/AuthContext.tsx` (isOrganiser check)
- `frontend/src/components/ProtectedRoute.tsx` (requireOrganiser prop)
- `frontend/src/pages/Login.tsx` (removed signup link)
- `frontend/src/App.tsx` (removed registration routes)
- `frontend/src/pages/TournamentAwards.tsx` (clean sheets display)

## ⚡ Quick Commands

```bash
# Setup Benson
cd backend
python manage.py setup_benson

# Run server
python manage.py runserver

# Run frontend (in another terminal)
cd frontend
npm run dev
```

## 🐛 Troubleshooting

**Issue**: "ModuleNotFoundError: No module named 'django'"
- **Solution**: Activate your virtual environment first

**Issue**: "Access restricted" when logging in
- **Solution**: Make sure username is exactly "Benson" (case-sensitive)

**Issue**: "Only authorised users can login"
- **Solution**: Run `python manage.py setup_benson` to create the user

**Issue**: Views.py import errors
- **Solution**: Restore the complete views.py file from version control

