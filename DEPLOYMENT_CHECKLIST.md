# Deployment Checklist

## ✅ Completed Features

### 1. Manual Payment Confirmation
- ✅ Backend endpoint: `POST /registrations/{id}/mark-paid/` (organizer only)
- ✅ Frontend: "Mark Paid" button in Registrations tab (visible to organizers)
- ✅ Payment status badges (Paid/Pending) on team cards
- ✅ Automatic email notification when payment is confirmed

### 2. Email Notifications
- ✅ Registration confirmation email to manager
- ✅ Payment confirmation email to manager
- ✅ New registration notification to organizer
- ✅ Email settings configured (console backend in dev, SMTP in production)
- ✅ Email templates in `backend/tournaments/emails.py`

### 3. Tournament Slug URLs
- ✅ Slug field added to Tournament model (auto-generated from name)
- ✅ Backend endpoint: `GET /tournaments/by-slug/{slug}/`
- ✅ Frontend updated to use slugs in URLs when available
- ✅ Fallback to ID-based URLs for backward compatibility
- ✅ Leagues page already supports slug navigation

### 4. Production Settings
- ✅ Environment variable support added
- ✅ Production settings template created
- ✅ Email configuration ready for production
- ✅ Security settings prepared

## 📋 Next Steps for Deployment

### Database Migration
```bash
# Activate virtual environment first
cd backend
python manage.py makemigrations tournaments
python manage.py migrate
```

### Environment Variables
Create a `.env` file in the `backend/` directory (see `backend/.env.example`):
- `SECRET_KEY` - Generate a new secret key
- `DEBUG=False` - Set to False in production
- `ALLOWED_HOSTS` - Your domain name
- Database credentials (PostgreSQL)
- Email credentials (SMTP)

### Email Setup
1. For Gmail: Create an App Password (not regular password)
2. Set `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` in `.env`
3. Set `DEFAULT_FROM_EMAIL` to your sender email

### Frontend Build
```bash
cd frontend
npm run build
```

### Deployment Platforms
- **Recommended**: Railway.app or Render.com (easiest for Django + React)
- **Alternative**: DigitalOcean App Platform
- **Advanced**: Traditional VPS (DigitalOcean, Linode)

## 🚀 Quick Start Commands

### Local Development
```bash
# Backend
cd backend
python manage.py runserver

# Frontend
cd frontend
npm run dev
```

### Production Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run migrations
4. Collect static files: `python manage.py collectstatic`
5. Deploy backend (Django)
6. Deploy frontend (React build)
7. Configure domain and SSL

## 📝 Notes

- Slug migration needs to be run to add slug field to existing tournaments
- Existing tournaments will auto-generate slugs on next save
- Email will use console backend in development (prints to terminal)
- All new tournaments will automatically get slugs

