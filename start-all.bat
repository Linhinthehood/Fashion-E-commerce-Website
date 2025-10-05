@echo off
echo ========================================
echo   Starting Fashion E-commerce Website
echo ========================================
echo.

echo Starting API Gateway...
start "API Gateway" cmd /k "cd backend\api-gateway && npm start"
timeout /t 2 /nobreak > nul

echo Starting User Service...
start "User Service" cmd /k "cd backend\user-service && npm start"
timeout /t 2 /nobreak > nul

echo Starting Product Service...
start "Product Service" cmd /k "cd backend\product-service && npm start"
timeout /t 2 /nobreak > nul

echo Starting Order Service...
start "Order Service" cmd /k "cd backend\order-service && npm start"
timeout /t 2 /nobreak > nul

echo Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   All Services Started!
echo ========================================
echo.
echo Services running:
echo   - API Gateway:      http://localhost:3000
echo   - User Service:     http://localhost:3001
echo   - Product Service:  http://localhost:3002
echo   - Order Service:    http://localhost:3003
echo   - Frontend:         http://localhost:5173
echo.
echo Press any key to close this window...
pause > nul
