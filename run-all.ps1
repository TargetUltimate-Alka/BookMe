Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          Starting BookMe Platform Locally         " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot

Write-Host "Launching microservices in separate windows..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\services\auth-service'; Write-Host '--- Auth Service (Port 3001) ---' -ForegroundColor Green; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\services\vendor-service'; Write-Host '--- Vendor Service (Port 3002) ---' -ForegroundColor Green; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\services\event-booking-service'; Write-Host '--- Event-Booking Service (Port 4003) ---' -ForegroundColor Green; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\services\payment-feedback-service'; Write-Host '--- Payment-Feedback Service (Port 3004) ---' -ForegroundColor Green; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\services\admin-service'; Write-Host '--- Admin Service (Port 3005) ---' -ForegroundColor Green; npm start"

Write-Host "Launching React Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; Write-Host '--- Frontend (Port 5173) ---' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "All 6 processes have been started in separate windows!" -ForegroundColor Green
Write-Host "Open your browser at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
