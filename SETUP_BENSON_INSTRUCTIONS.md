# How to Run setup_benson Command

## Step-by-Step Instructions

### Option 1: PowerShell (Recommended for Windows)

1. **Open PowerShell** in the project root directory (`Tournament` folder)

2. **Activate the virtual environment:**
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
   
   If you get an execution policy error, run this first:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Navigate to backend directory:**
   ```powershell
   cd backend
   ```

4. **Run the setup command:**
   ```powershell
   python manage.py setup_benson
   ```

### Option 2: Command Prompt (CMD)

1. **Open Command Prompt** in the project root directory

2. **Activate the virtual environment:**
   ```cmd
   venv\Scripts\activate.bat
   ```

3. **Navigate to backend directory:**
   ```cmd
   cd backend
   ```

4. **Run the setup command:**
   ```cmd
   python manage.py setup_benson
   ```

### Option 3: All in One Command (PowerShell)

From the `Tournament` root directory, run:
```powershell
.\venv\Scripts\Activate.ps1; cd backend; python manage.py setup_benson
```

## Expected Output

You should see:
```
✓ Created new user: Benson
✓ Password set for Benson

✓ Setup complete!

Login credentials:
  Username: Benson
  Password: benson123
  is_staff: True
  is_superuser: True
```

## Troubleshooting

**Error: "ModuleNotFoundError: No module named 'django'"**
- Make sure you activated the virtual environment first
- You should see `(venv)` at the start of your command prompt

**Error: "Execution Policy" (PowerShell)**
- Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- Then try activating again

**Error: "Command not found"**
- Make sure you're in the `Tournament` root directory (where `venv` folder is)
- Then navigate to `backend` after activating

## Quick Test After Setup

1. Start the Django server:
   ```powershell
   python manage.py runserver
   ```

2. In another terminal, start the frontend:
   ```powershell
   cd frontend
   npm run dev
   ```

3. Go to `http://localhost:5173/login` and login with:
   - Username: `Benson`
   - Password: `benson123`

