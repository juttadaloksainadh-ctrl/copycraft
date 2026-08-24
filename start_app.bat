@echo off
echo ========================================================
echo        Starting CopyCraft SaaS Engine (Full Stack)
echo ========================================================
echo 1. Starting Backend API on http://localhost:5000...
start "CopyCraft Backend (Port 5000)" cmd /k "cd backend && npm start"

echo 2. Starting Frontend on http://localhost:3000...
start "CopyCraft Frontend (Port 3000)" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are launching in separate windows!
echo Backend:  http://localhost:5000/api
echo Frontend: http://localhost:3000
echo ========================================================
