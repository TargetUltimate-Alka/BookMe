/**
 * BookMe - Central Monorepo Entrypoint & Service Directory Guide
 * 
 * Note: BookMe is built on a Distributed Microservices Architecture.
 * Source code is modularized per service and frontend:
 * 
 * - Frontend UI:              ./frontend/src/
 * - Vendor Microservice:       ./services/vendor-service/src/
 * - Event & Booking Service:   ./services/event-booking-service/src/
 * - Auth Microservice:         ./services/auth-service/src/
 * - Payment & Feedback:        ./services/payment-feedback-service/src/
 * - Admin Microservice:        ./services/admin-service/src/
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('==================================================');
console.log('       BookMe Multi-Service Platform Guide        ');
console.log('==================================================');
console.log('All source code files (249+ files) are located in:');
console.log('1. frontend/src/                 (React 19 + Vite UI)');
console.log('2. services/vendor-service/src/  (Port 3002 - Vendor OS & 60 Categories)');
console.log('3. services/event-booking-service/src/ (Port 4003 - Bookings & Events)');
console.log('4. services/auth-service/src/    (Port 3001 - Auth, OTP & JWT)');
console.log('5. services/payment-feedback-service/src/ (Port 3004 - Payments & Reviews)');
console.log('6. services/admin-service/src/   (Port 3005 - Admin & Audit Logs)');
console.log('==================================================');

module.exports = {
  frontendPath: path.resolve(__dirname, '../frontend/src'),
  vendorServicePath: path.resolve(__dirname, '../services/vendor-service/src'),
  eventBookingServicePath: path.resolve(__dirname, '../services/event-booking-service/src'),
  authServicePath: path.resolve(__dirname, '../services/auth-service/src'),
  paymentServicePath: path.resolve(__dirname, '../services/payment-feedback-service/src'),
  adminServicePath: path.resolve(__dirname, '../services/admin-service/src')
};
