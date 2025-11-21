# Tournament Site - Pre-Launch Checklist

## Immediate Fixes for Combination Tournament (Champions League Format)

### 1. Fix Combination Tournament Fixture Generation
- [x] Update `generate_combination_fixtures` to generate matches in rounds (6 rounds for 4-team groups)
- [x] Only generate GROUP STAGE matches initially (not knockout)
- [ ] Add function to generate knockout stage after group stage completes
- [ ] Fix round pairing logic to match Champions League format:
  - Round 1: Team 1 vs Team 2, Team 3 vs Team 4
  - Round 2: Team 1 vs Team 3, Team 2 vs Team 4
  - Round 3: Team 1 vs Team 4, Team 2 vs Team 3
  - Round 4-6: Reverse of rounds 1-3 (home/away swapped)

### 2. Fix Database Errors
- [x] Fix UNIQUE constraint on MatchScorer (ensure unique minutes for same player)
- [x] Add retry logic for database locking errors
- [ ] Test with multiple concurrent simulations

### 3. Fix Match Simulation
- [x] Ensure each goal by same player has unique minute
- [ ] Add validation to prevent duplicate scorer records
- [ ] Handle edge cases (0-0 draws, penalty shootouts for knockout)

---

## Core Functionality Checklist (Minimum for First Tournament)

### Backend (Django)

#### Tournament Setup
- [x] Create tournament (wizard working)
- [x] Set tournament format (League, Knockout, Combination)
- [x] Set team capacity
- [x] Set dates and times
- [ ] Validate tournament settings before generating fixtures

#### Teams & Registrations
- [x] Register teams
- [x] Mark registrations as paid
- [x] Seed test teams/players
- [ ] Validate team has minimum players before fixture generation

#### Fixtures
- [x] Generate fixtures for league format
- [x] Generate fixtures for knockout format
- [ ] Fix combination format (Champions League) fixture generation
- [ ] Generate only first round initially (not all rounds)
- [ ] Auto-generate next rounds as matches complete

#### Match Simulation
- [x] Simulate round-by-round
- [ ] Fix combination tournament simulation (group stage → knockout)
- [ ] Ensure no database locking errors
- [ ] Ensure no duplicate scorer records

#### Standings & Results
- [x] Calculate league standings
- [x] Calculate group standings (for combinationB)
- [x] Display knockout bracket
- [ ] Update standings after each round completes

### Frontend (React)

#### Tournament Management
- [x] Tournament creation wizard
- [x] Tournament detail page
- [x] Edit tournament
- [ ] Validation for time fields (end_time > start_time)

#### Match Management
- [x] View fixtures
- [x] View results
- [ ] Display live matches (if implemented)
- [ ] Match filtering by round/group

#### User Interface
- [x] Tournament list
- [x] Tournament detail tabs
- [x] Standings display
- [ ] Responsive design testing

---

## Testing Checklist (Before First Tournament)

### Functionality Tests
1. [ ] Create combination tournament with 16 teams
2. [ ] Verify groups are created correctly (e.g., 4 groups of 4)
3. [ ] Verify Round 1 generates correctly (2 matches per group = 8 matches total)
4. [ ] Simulate Round 1 and verify Round 2 appears
5. [ ] Complete all 6 group stage rounds
6. [ ] Verify knockout stage generates after group stage
7. [ ] Verify top 2 from each group advance
8. [ ] Complete knockout rounds
9. [ ] Verify final winner is declared

### Error Handling Tests
1. [ ] Test with database locking (multiple simultaneous operations)
2. [ ] Test duplicate scorer entries (same player, same minute)
3. [ ] Test with incomplete team data
4. [ ] Test with tournaments at capacity

### Data Integrity Tests
1. [ ] Verify standings update correctly after each round
2. [ ] Verify scorer statistics update correctly
3. [ ] Verify team statistics (goals for/against, wins/losses)
4. [ ] Verify knockout bracket shows correct progression

---

## Deployment Checklist

### Environment Setup
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Database migrations applied (`python manage.py migrate`)
- [ ] Environment variables configured (.env file)

### Database
- [ ] SQLite working for development (or PostgreSQL for production)
- [ ] No pending migrations
- [ ] Test data seeded (optional)

### Server Configuration
- [ ] Backend server running (port 8000)
- [ ] Frontend dev server running (port 5173)
- [ ] CORS configured correctly
- [ ] API endpoints accessible

### Security
- [ ] API authentication working
- [ ] Organizer permissions enforced
- [ ] User registration/login working

---

## Post-Launch Support Checklist

### Monitoring
- [ ] Set up error logging
- [ ] Monitor database performance
- [ ] Track API response times

### User Support
- [ ] Create user guide/documentation
- [ ] Set up support email/contact
- [ ] Prepare FAQ for common issues

---

## Known Issues to Fix

1. **Combination Tournament Fixture Generation**
   - Currently generates all matches at once
   - Should generate round-by-round (6 rounds for 4-team groups)
   - Knockout stage should generate after group stage completes

2. **Database Locking**
   - Add retry logic with exponential backoff
   - Consider using connection pooling

3. **Scorer Duplicates**
   - Ensure unique (match_id, player_id, minute) combinations
   - Handle multiple goals by same player with different minutes

4. **Match Simulation**
   - Fix combination tournament group stage completion detection
   - Auto-generate knockout stage when group stage finishes

---

## Quick Start Guide for First Tournament

1. **Create Tournament**
   - Go to `/host/wizard`
   - Fill in tournament details
   - Select "Combination" format
   - Select "Groups → Knockout" type
   - Set team capacity (e.g., 16 for 4 groups of 4)
   - Set start/end dates and times

2. **Register Teams**
   - Go to tournament detail page
   - Use "Seed Test Teams" button
   - Or manually register teams

3. **Generate Fixtures**
   - Click "Generate Fixtures" button
   - Verify Round 1 matches appear (should be 8 matches for 16 teams in 4 groups)

4. **Simulate Rounds**
   - Click "Simulate Round" button repeatedly
   - Each round should complete before next appears
   - After Round 6, knockout stage should appear

5. **Complete Tournament**
   - Continue simulating knockout rounds
   - Final match determines winner

---

## Critical Files to Review

### Backend
- `backend/tournaments/tournament_formats.py` - Fixture generation logic
- `backend/tournaments/simulation_helpers.py` - Match simulation and round generation
- `backend/tournaments/models.py` - Database models
- `backend/tournaments/views.py` - API endpoints

### Frontend
- `frontend/src/pages/host/wizard/` - Tournament creation wizard
- `frontend/src/pages/TournamentDetail.tsx` - Tournament detail page
- `frontend/src/components/tournament/TournamentTabs.tsx` - Match display

---

## Next Steps (After First Tournament)

1. Referee system implementation
2. Live match tracking
3. Payment integration
4. Email notifications
5. Mobile responsiveness improvements
6. Performance optimization

