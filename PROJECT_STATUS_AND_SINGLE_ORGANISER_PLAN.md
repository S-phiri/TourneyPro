# Tournament App - Project Status & Single Organiser Mode Plan

## PART 1 – Project Status Summary

### A. Backend Overview

#### Django Apps
- **`accounts`**: User profile management
  - `UserProfile` model with `role_hint` field (choices: "host", "manager", "viewer")
  - Auto-creates profile on user creation via signals
- **`tournaments`**: Core tournament functionality
  - Models: `Tournament`, `Team`, `Registration`, `Match`, `Player`, `TeamPlayer`, `MatchScorer`, `MatchAssist`, `Venue`, `Referee`
  - Tournament has `organizer` ForeignKey to User
  - Tournament has `slug` field (auto-generated from name)

#### Main Models
- **Tournament**: name, slug, description, city, dates, entry_fee, prizes, format (knockout/league/combination), organizer (FK to User), status, rules (JSON), structure (JSON)
- **Team**: name, manager_name, manager_email, manager_user (FK to User), wins/draws/losses, goals_for/against
- **Registration**: Links Tournament to Team, has status (pending/paid/cancelled)
- **Match**: tournament, home_team, away_team, scores, penalties, status (scheduled/finished)
- **Player**: user (FK), first_name, last_name, goals, assists, clean_sheets
- **TeamPlayer**: Links Player to Team with number and captain flag

#### DRF Viewsets & Endpoints

**Authentication (`core/urls.py`):**
- `POST /api/auth/login/` - TokenObtainPairView (JWT login)
- `POST /api/auth/refresh/` - TokenRefreshView
- `POST /api/auth/verify/` - TokenVerifyView
- `GET /api/auth/me/` - UserView (requires IsAuthenticated)
- `POST /api/auth/register/` - RegisterView (AllowAny) - Creates user with role_hint='host'
- `POST /api/auth/register-manager/` - RegisterManagerView (AllowAny) - Creates manager user

**Tournaments (`TournamentViewSet`):**
- `GET /api/tournaments/` - List (IsAuthenticatedOrReadOnly → AllowAny for list)
- `GET /api/tournaments/{id}/` - Retrieve (AllowAny)
- `GET /api/tournaments/by-slug/{slug}/` - By slug (AllowAny)
- `POST /api/tournaments/` - Create (IsAuthenticated - any authenticated user)
- `PUT/PATCH /api/tournaments/{id}/` - Update (IsAuthenticated + IsTournamentOrganiser)
- `DELETE /api/tournaments/{id}/` - Delete (IsAuthenticated + IsTournamentOrganiser)
- `GET /api/tournaments/{id}/standings/` - Standings (AllowAny)
- `GET /api/tournaments/{id}/awards/` - Awards (AllowAny)
- `POST /api/tournaments/{id}/register/` - Team registration (AllowAny)
- `POST /api/tournaments/{id}/generate-fixtures/` - Generate fixtures (IsAuthenticated + IsTournamentOrganiser)
- `POST /api/tournaments/{id}/simulate-round/` - Simulate matches (IsAuthenticated + IsTournamentOrganiser)
- `POST /api/tournaments/{id}/set-score/` - Update match score (IsAuthenticated + IsMatchRefereeOrOrganizer)
- `GET /api/tournaments/mine/` - Organiser's tournaments (IsAuthenticated)

**Teams (`TeamViewSet`):**
- Permission: `IsAuthenticatedOrReadOnly + IsTeamManagerOrReadOnly`
- Managers can edit their teams, others read-only

**Registrations (`RegistrationViewSet`):**
- Permission: `IsAuthenticatedOrReadOnly + IsOrganizerOfRelatedTournamentOrReadOnly`
- Organisers can mark as paid, others read-only

**Matches (`MatchViewSet`):**
- Permission: `IsAuthenticatedOrReadOnly + IsOrganizerOfRelatedTournamentOrReadOnly`
- `POST /api/matches/{id}/score/` - Update score (IsMatchRefereeOrOrganizer)

#### Current Permission Classes
- `IsAuthenticatedOrReadOnly`: Read for all, write for authenticated
- `AllowAny`: Public access
- `IsAuthenticated`: Requires login
- `IsTournamentOrganiser`: Checks if user is tournament.organizer
- `IsOrganizerOfRelatedTournamentOrReadOnly`: Checks tournament.organizer via related object
- `IsTeamManagerOrReadOnly`: Team managers can edit, others read-only
- `IsMatchRefereeOrOrganizer`: Referees or organisers can update matches

#### JWT Auth Configuration
- Uses `rest_framework_simplejwt`
- Access token lifetime: 60 minutes
- Refresh token lifetime: 7 days
- Token rotation enabled
- Default auth class: `JWTAuthentication`
- Default permission: `IsAuthenticated` (overridden per viewset)

### B. Frontend Overview

#### Routes (`App.tsx`)
- `/` - Home page
- `/login` - Organiser login
- `/signup` - Organiser registration
- `/manager/login` - Manager login
- `/manager/signup` - Manager registration
- `/dashboard` - Protected, shows organiser's tournaments
- `/start-hosting` - Protected
- `/host/new` - Protected, tournament creation wizard
- `/tournaments/:slug` - Tournament detail (public)
- `/tournaments/:slug/edit` - Protected, edit tournament
- `/tournaments/:slug/register` - Team registration (public)
- `/tournaments/:slug/fixtures` - Fixtures page (public)
- `/tournaments/:slug/awards` - Awards page (public)
- `/teams/:id` - Team hub (public)
- `/teams/:id/add-players` - Add players (public, but requires manager auth for editing)

#### AuthContext (`context/AuthContext.tsx`)
- Manages JWT tokens (access + refresh) in localStorage
- Provides: `user`, `accessToken`, `isLoading`, `login()`, `logout()`, `isAuthenticated`, `isOrganizer`, `roleHint`, `getMe()`, `getTournamentRole()`
- `isOrganizer` is currently `!!accessToken` (any authenticated user)
- Auto-refreshes tokens on 401 errors
- Fetches user data on app load

#### Components/Pages Handling Auth
- **Login**: `pages/Login.tsx` - Uses `useAuth().login()`, redirects to dashboard
- **Registration**: `pages/SignUp.tsx` - Calls `/api/auth/register/`, auto-login on success
- **Manager Login**: `pages/ManagerLogin.tsx` - Uses same auth flow
- **Manager SignUp**: `pages/ManagerSignUp.tsx` - Calls `/api/auth/register-manager/`
- **ProtectedRoute**: Wraps pages requiring auth, redirects to login if not authenticated
- **TournamentDetail**: Checks `tournamentRole.is_organiser` to show edit buttons
- **Fixtures**: Uses `isOrganizer` to show add/edit match buttons
- **Dashboard**: Fetches `/tournaments/mine/` (requires auth)

#### Tournament Creation
- `pages/host/wizard/TournamentWizard.tsx` - Multi-step wizard
- Protected route, requires authentication
- Creates tournament via `POST /api/tournaments/`

#### Score Updating
- `components/tournament/UpdateScoreModal.tsx` - Modal for updating match scores
- Calls `POST /api/matches/{id}/score/`
- Visible to organisers and referees

#### Viewing Tables/Brackets
- `components/tournament/TournamentTabs.tsx` - Shows standings, fixtures, brackets
- `components/tournament/GroupStandings.tsx` - Group stage standings
- `components/tournament/KnockoutBracket.tsx` - Knockout bracket visualization
- All public (no auth required)

### C. Current Auth & Roles

#### Registration Flow
1. **Organiser Registration** (`/signup`):
   - Calls `POST /api/auth/register/`
   - Creates User with UserProfile (role_hint='host')
   - Returns JWT tokens
   - Auto-login and redirect to dashboard

2. **Manager Registration** (`/manager/signup`):
   - Calls `POST /api/auth/register-manager/`
   - Creates User with UserProfile (role_hint='manager')
   - Returns JWT tokens
   - Auto-login

#### Login Flow
1. User enters username/password
2. Frontend calls `POST /api/auth/login/` (TokenObtainPairView)
3. Receives access + refresh tokens
4. Stores in localStorage
5. Fetches user data via `GET /api/auth/me/`
6. Redirects to dashboard or intended destination

#### Actions Requiring Login (Frontend)
- Accessing `/dashboard`
- Accessing `/start-hosting`
- Creating tournament (`/host/new`)
- Editing tournament (`/tournaments/:slug/edit`)
- Generating fixtures
- Simulating matches
- Updating scores (organiser only)

#### Role/Permission Logic
- **Backend**: Checks `tournament.organizer_id == request.user.id` for organiser permissions
- **Frontend**: 
  - `isOrganizer` = `!!accessToken` (any authenticated user)
  - `tournamentRole.is_organiser` = fetched per tournament via `GET /api/tournaments/{id}/role/`
  - `tournamentRole.is_manager` = user is team manager for that tournament
- **UserProfile.role_hint**: "host", "manager", "viewer" (informational, not used for permissions)

### D. Deployment/ENV

#### Environment Variables
- **Backend**: Uses `python-dotenv`, loads from `.env`
  - `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
  - Database settings (SQLite in dev, Postgres in prod)
  - Email settings (SMTP)
- **Frontend**: Uses `import.meta.env`
  - `VITE_API_BASE_URL` - API base URL (e.g., `http://localhost:8000/api`)
  - `VITE_ENVIRONMENT` - Used to hide testing tools in production
  - `VITE_TEMPO` - Tempo devtools flag

#### API Base URL
- Defined in `frontend/src/lib/api.ts` and `frontend/src/lib/auth.ts`
- Uses `import.meta.env.VITE_API_BASE_URL`
- Defaults to relative path if not set

#### CORS Configuration
- Backend allows: `http://localhost:5173`, `http://127.0.0.1:5173`
- `CORS_ALLOW_CREDENTIALS = True`
- Headers: accept, authorization, content-type, etc.

#### Issues for Deployment
- No `.env` file in repo (only `env.example`)
- Frontend `VITE_API_BASE_URL` must be set for production
- CORS origins need to be updated for production domain
- Database migration needed before first run

---

## PART 2 – Single Organiser Mode Design

### 1. Backend Changes

#### 1.1 Disable User Registration
- **Option A (Recommended)**: Return 403/404 from registration endpoints
  - Modify `RegisterView.post()` to return `403 Forbidden` with message "Registration is disabled"
  - Modify `RegisterManagerView.post()` to return `403 Forbidden`
  - Keep endpoints in URLs for backward compatibility (or remove them)

- **Option B**: Remove registration endpoints entirely
  - Remove from `core/urls.py`
  - Cleaner but breaks any existing links

#### 1.2 Keep Only Login & Refresh
- `POST /api/auth/login/` - Keep as-is (TokenObtainPairView)
- `POST /api/auth/refresh/` - Keep as-is (TokenRefreshView)
- `GET /api/auth/me/` - Keep as-is (requires IsAuthenticated)
- Remove or disable registration endpoints (see 1.1)

#### 1.3 Organiser Flag
- **Option A**: Use Django's `is_staff` or `is_superuser`
  - Set `is_staff=True` for the organiser user
  - Create permission class `IsStaff` that checks `request.user.is_staff`
  - Pros: No model changes, uses built-in Django feature
  - Cons: `is_staff` typically implies admin access

- **Option B**: Add custom field to UserProfile
  - Add `is_organiser = models.BooleanField(default=False)` to `UserProfile`
  - Create permission class `IsOrganiser` that checks `request.user.profile.is_organiser`
  - Pros: Clear separation, doesn't interfere with Django admin
  - Cons: Requires migration

- **Option C**: Use existing `role_hint` field
  - Check `request.user.profile.role_hint == 'host'`
  - Pros: No changes needed
  - Cons: Less explicit, role_hint was meant for frontend hints

**Recommendation**: Option A (use `is_staff`) for simplicity, or Option B for clarity.

#### 1.4 WRITE Actions Require Organiser
- Update permission classes:
  - Tournament create/update/delete: `IsAuthenticated + IsOrganiser` (or `IsStaff`)
  - Match score updates: `IsAuthenticated + IsOrganiser`
  - Team creation/editing: `IsAuthenticated + IsOrganiser`
  - Registration management: `IsAuthenticated + IsOrganiser`
  - Fixture generation: `IsAuthenticated + IsOrganiser`
  - Match simulation: `IsAuthenticated + IsOrganiser`

- Create new permission class:
  ```python
  class IsOrganiser(BasePermission):
      def has_permission(self, request, view):
          if not request.user.is_authenticated:
              return False
          # Option A: Check is_staff
          return request.user.is_staff
          # Option B: Check UserProfile.is_organiser
          # return getattr(request.user, 'profile', None) and request.user.profile.is_organiser
  ```

#### 1.5 READ Endpoints AllowAny
- Ensure these endpoints use `AllowAny`:
  - `GET /api/tournaments/` - List tournaments
  - `GET /api/tournaments/{id}/` - Tournament detail
  - `GET /api/tournaments/by-slug/{slug}/` - Tournament by slug
  - `GET /api/tournaments/{id}/standings/` - Standings
  - `GET /api/tournaments/{id}/awards/` - Awards
  - `GET /api/tournaments/{id}/top-scorers/` - Top scorers
  - `GET /api/tournaments/{id}/top-assists/` - Top assists
  - `GET /api/matches/` - List matches (filtered by tournament)
  - `GET /api/teams/` - List teams
  - `GET /api/registrations/` - List registrations

- These already use `AllowAny` or `IsAuthenticatedOrReadOnly` (read operations)

### 2. Frontend Changes

#### 2.1 Remove/Hide Registration
- **Remove routes**:
  - `/signup` - Remove route and component (or redirect to home)
  - `/manager/signup` - Remove route and component
  - Remove "Sign up" links from Login page and Navbar

- **Hide registration UI**:
  - Remove "Register Team" button from TournamentDetail (or show only to organiser)
  - Remove registration links from home page

#### 2.2 Keep Organiser Login
- Keep `/login` route and `Login.tsx` component
- Update text: "Organiser Login" instead of generic "Login"
- Remove "Create account" link
- Keep `/manager/login` for backward compatibility (or remove if not needed)

#### 2.3 Organiser-Only UI
- **Update `isOrganizer` logic**:
  - Currently: `isOrganizer = !!accessToken`
  - Change to: Check if user has organiser flag (via `/api/auth/me/` response or separate check)
  - Or: Keep as-is but add backend validation (backend will reject non-organiser writes)

- **Show edit UI only when logged in as organiser**:
  - TournamentDetail: Show "Edit Tournament", "Generate Fixtures", "Simulate" only if `isAuthenticated && isOrganizer`
  - Fixtures: Show "Add Match", "Edit Score" only if `isAuthenticated && isOrganizer`
  - Dashboard: Only show if `isAuthenticated && isOrganizer`

- **Protected routes**:
  - `/dashboard` - Requires `isAuthenticated && isOrganizer`
  - `/host/new` - Requires `isAuthenticated && isOrganiser`
  - `/tournaments/:slug/edit` - Requires `isAuthenticated && isOrganiser`

#### 2.4 Read-Only for Visitors
- Ensure all read-only pages work without authentication:
  - `/tournaments/:slug` - Tournament detail (already public)
  - `/tournaments/:slug/fixtures` - Fixtures (already public)
  - `/tournaments/:slug/awards` - Awards (already public)
  - `/teams/:id` - Team hub (already public)
  - `/` - Home page (already public)
  - `/leagues` - Tournament list (already public)

- Remove any auth checks that block viewing
- Handle 401 errors gracefully (don't break UI)

#### 2.5 AuthContext Changes
- Add `isOrganiser` check:
  - Fetch user profile on login
  - Check `user.is_staff` or `user.profile.is_organiser` (depending on backend choice)
  - Expose `isOrganiser` boolean in context

- Update `ProtectedRoute`:
  - Add optional `requireOrganiser` prop
  - If `requireOrganiser=true`, check `isOrganiser` in addition to `isAuthenticated`

#### 2.6 API Client Changes
- No changes needed - backend will handle permission checks
- Frontend should handle 403 errors gracefully (show message: "Organiser access required")

---

## PART 3 – Implementation Checklist

### Backend Implementation

1. **Create `IsOrganiser` permission class** (`tournaments/permissions.py`)
   - Check `request.user.is_staff` (or `request.user.profile.is_organiser`)

2. **Disable registration endpoints** (`tournaments/views.py`)
   - Modify `RegisterView.post()` to return 403
   - Modify `RegisterManagerView.post()` to return 403

3. **Update TournamentViewSet permissions** (`tournaments/views.py`)
   - Create: `IsAuthenticated + IsOrganiser`
   - Update/Delete: `IsAuthenticated + IsOrganiser`
   - List/Retrieve: Keep `AllowAny`

4. **Update MatchViewSet permissions** (`tournaments/views.py`)
   - Score update: `IsAuthenticated + IsOrganiser`
   - List/Retrieve: Keep `AllowAny`

5. **Update TeamViewSet permissions** (`tournaments/views.py`)
   - Create/Update: `IsAuthenticated + IsOrganiser`
   - List/Retrieve: Keep `AllowAny`

6. **Update RegistrationViewSet permissions** (`tournaments/views.py`)
   - Mark paid: `IsAuthenticated + IsOrganiser`
   - List/Retrieve: Keep `AllowAny`

7. **Update action permissions** (`tournaments/views.py`)
   - `generate_fixtures`: `IsAuthenticated + IsOrganiser`
   - `simulate_round`: `IsAuthenticated + IsOrganiser`
   - `set_score`: `IsAuthenticated + IsOrganiser`
   - All read actions: Keep `AllowAny`

8. **Create organiser user** (via Django admin or management command)
   - Set `is_staff=True` (or `profile.is_organiser=True`)

### Frontend Implementation

1. **Remove registration routes** (`App.tsx`)
   - Remove `/signup` route
   - Remove `/manager/signup` route

2. **Update Login page** (`pages/Login.tsx`)
   - Change title to "Organiser Login"
   - Remove "Create account" link

3. **Update AuthContext** (`context/AuthContext.tsx`)
   - Add `isOrganiser` check (from `user.is_staff` or API response)
   - Expose `isOrganiser` in context

4. **Update ProtectedRoute** (`components/ProtectedRoute.tsx`)
   - Add `requireOrganiser` prop
   - Check `isOrganiser` if required

5. **Update Dashboard** (`pages/Dashboard.tsx`)
   - Add `requireOrganiser` to ProtectedRoute
   - Show message if not organiser

6. **Update TournamentDetail** (`pages/TournamentDetail.tsx`)
   - Show edit buttons only if `isAuthenticated && isOrganiser`
   - Hide "Register Team" button (or show only to organiser for testing)

7. **Update Fixtures** (`pages/Fixtures.tsx`)
   - Show "Add Match", "Edit Score" only if `isAuthenticated && isOrganiser`

8. **Update Navbar** (`components/Navbar.tsx`)
   - Remove "Sign Up" links
   - Show "Login" only if not authenticated

9. **Update Home page** (`components/home.tsx`)
   - Remove registration CTAs
   - Keep "View Tournaments" CTA

10. **Handle 403 errors gracefully**
    - Show user-friendly message: "Organiser access required"
    - Don't break UI on permission errors

---

## PART 4 – Final Report

### Files Changed

#### Backend
- `backend/tournaments/permissions.py` - Add `IsOrganiser` permission class
- `backend/tournaments/views.py` - Disable registration, update permissions
- `backend/core/urls.py` - (Optional) Remove registration endpoints

#### Frontend
- `frontend/src/App.tsx` - Remove registration routes
- `frontend/src/context/AuthContext.tsx` - Add `isOrganiser` check
- `frontend/src/components/ProtectedRoute.tsx` - Add `requireOrganiser` prop
- `frontend/src/pages/Login.tsx` - Update UI text, remove signup link
- `frontend/src/pages/Dashboard.tsx` - Require organiser
- `frontend/src/pages/TournamentDetail.tsx` - Show edit UI only to organiser
- `frontend/src/pages/Fixtures.tsx` - Show edit UI only to organiser
- `frontend/src/components/Navbar.tsx` - Remove signup links
- `frontend/src/components/home.tsx` - Remove registration CTAs

### New Auth Flow

1. **Organiser Login**:
   - Navigate to `/login`
   - Enter username/password
   - Backend validates and returns JWT tokens
   - Frontend stores tokens and fetches user data
   - If user has `is_staff=True` (or `is_organiser=True`), `isOrganiser=true`
   - Redirect to dashboard

2. **Public Viewing**:
   - No login required
   - Can view tournaments, fixtures, standings, brackets, team hubs
   - All read-only

3. **Organiser Actions**:
   - Must be logged in with organiser account
   - Can create/edit tournaments
   - Can add/edit teams
   - Can add/edit fixtures and scores
   - Can generate fixtures and simulate matches

### Instructions for Setup

#### 1. Create Organiser User (Django)

**Option A: Via Django Admin**
```bash
cd backend
python manage.py createsuperuser
# Enter username, email, password
# In admin, set is_staff=True for this user
```

**Option B: Via Django Shell**
```bash
cd backend
python manage.py shell
```
```python
from django.contrib.auth.models import User
user = User.objects.create_user('organiser', 'organiser@example.com', 'your_password')
user.is_staff = True
user.save()
```

**Option C: Via Management Command** (create if needed)
```python
# backend/tournaments/management/commands/create_organiser.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, required=True)
        parser.add_argument('--password', type=str, required=True)
        parser.add_argument('--email', type=str, default='')

    def handle(self, *args, **options):
        user = User.objects.create_user(
            username=options['username'],
            email=options['email'],
            password=options['password']
        )
        user.is_staff = True
        user.save()
        self.stdout.write(self.style.SUCCESS(f'Organiser user "{user.username}" created'))
```
```bash
python manage.py create_organiser --username organiser --password your_password --email organiser@example.com
```

#### 2. Log In as Organiser (Frontend)

1. Start backend: `cd backend && python manage.py runserver`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to `http://localhost:5173/login`
4. Enter organiser username and password
5. Should redirect to `/dashboard`

#### 3. Basic Tournament Flow

1. **Create Tournament**:
   - Login as organiser
   - Go to `/dashboard` or `/start-hosting`
   - Click "Create Tournament" or go to `/host/new`
   - Fill wizard steps (basics, format, rules, structure, prizes, review)
   - Submit

2. **Add Teams**:
   - Go to tournament detail page
   - Click "Add Team" (organiser-only)
   - Enter team name, manager details
   - Save

3. **Generate Fixtures**:
   - Go to tournament detail
   - Click "Generate Fixtures" (organiser-only)
   - Fixtures created based on tournament format

4. **Update Scores**:
   - Go to `/tournaments/{slug}/fixtures`
   - Click "Update Score" on a match (organiser-only)
   - Enter scores, scorers, assists
   - Save

5. **View Public Pages**:
   - Logout or use incognito
   - Navigate to `/tournaments/{slug}`
   - Can view all tournament info, fixtures, standings, brackets
   - Cannot edit anything

### Notes

- Registration endpoints are disabled but still in URLs (return 403)
- All read endpoints are public (AllowAny)
- All write endpoints require organiser authentication
- Frontend hides edit UI for non-organisers
- Backend enforces permissions regardless of frontend UI

