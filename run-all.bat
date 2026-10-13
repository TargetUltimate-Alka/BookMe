@echo off
echo ===================================================
echo           Starting BookMe Platform Locally
echo ===================================================
echo.
echo Launching microservices in separate windows...

start "BookMe - Auth Service (Port 3001)" cmd /k "cd services\auth-service && npm start"
start "BookMe - Vendor Service (Port 3002)" cmd /k "cd services\vendor-service && npm start"
start "BookMe - Event Booking Service (Port 4003)" cmd /k "cd services\event-booking-service && npm start"
start "BookMe - Payment Feedback Service (Port 3004)" cmd /k "cd services\payment-feedback-service && npm start"
start "BookMe - Admin Service (Port 3005)" cmd /k "cd services\admin-service && npm start"

echo.
echo Launching React Frontend (Port 5173)...
start "BookMe - Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo All services launched!
echo Access the frontend at: http://localhost:5173
echo ===================================================
