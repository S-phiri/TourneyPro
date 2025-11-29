# Render Superuser Migration Setup

## ✅ Migration Created Successfully

A migration has been created that will automatically create a superuser when you deploy to Render.

### Migration File Location

**File:** `backend/accounts/migrations/0002_create_superuser_phiri.py`

### Superuser Credentials

When this migration runs on Render, it will create a superuser with:

- **Username:** `Phiri`
- **Email:** `simba_phiri@outlook.com`
- **Password:** `Phiri@123`
- **Status:** Superuser + Staff (full admin access)

### How It Works

1. When Render runs `python manage.py migrate` during deployment
2. This migration will execute automatically
3. It checks if the user "Phiri" already exists
4. If not, it creates the superuser with the credentials above
5. Safe to run multiple times (won't create duplicates)

### Important Notes

⚠️ **Do NOT run this migration locally if you already have a superuser** - It will skip creation if "Phiri" exists, so it's safe, but you may want to test it first.

### Testing Locally (Optional)

If you want to test the migration locally:

```bash
cd backend
python manage.py migrate accounts
```

Then verify the user was created:
```bash
python manage.py shell
>>> from django.contrib.auth.models import User
>>> User.objects.filter(username='Phiri').exists()
True
```

### On Render

When you deploy to Render:

1. Render automatically runs: `python manage.py migrate`
2. This migration will execute
3. Superuser "Phiri" will be created automatically
4. You can then login to `/admin/` using:
   - Username: `Phiri`
   - Password: `Phiri@123`

### Security Note

⚠️ After the migration runs successfully on Render, consider:
- Changing the password immediately after first login
- The migration file contains the password in plain text (visible in your repository)

For better security in the future, you could:
- Use environment variables for credentials
- Or change the password right after first deployment

### Current Status

✅ Migration file created
✅ Credentials configured
✅ Ready to commit and deploy

The migration will run automatically when Render deploys your backend.

