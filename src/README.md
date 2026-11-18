# BookMe Source Code Architecture (`src/`)

Welcome to the **BookMe Platform**.

### 🔍 सोर्स कोड कहाँ स्थित है? (Where is the source code?)
BookMe एक **Microservices (Monorepo)** प्रोजेक्ट है, इसलिए यहाँ कोड किसी एक जगह नहीं, बल्कि अपने-अपने डोमेन/सर्विस के अंदर `src/` फोल्डर में व्यवस्थित है:

1. 💻 **Frontend Web App (React 19 + Vite)**:
   - पाथ: [`frontend/src/`](file:///c:/AI%20Coding%20Challenge%20Platform/BookMe/frontend/src)
   - फाइल्स: **84 फाइल्स** (App.jsx, Features: `vendor`, `events-booking`, `auth`, `marketplace`, `payments-reviews`)

2. 🏢 **Vendor Service Backend (Node.js/Express - Port 3002)**:
   - पाथ: [`services/vendor-service/src/`](file:///c:/AI%20Coding%20Challenge%20Platform/BookMe/services/vendor-service/src)
   - फाइल्स: **36 फाइल्स** (60 Categories, KYC, Atomic Availability Capacity, Packages, Add-ons)

3. 📅 **Event & Booking Service (Node.js/Express - Port 4003)**:
   - पाथ: [`services/event-booking-service/src/`](file:///c:/AI%20Coding%20Challenge%20Platform/BookMe/services/event-booking-service/src)
   - फाइल्स: **63 फाइल्स** (Events, Budget, Checklist, 12-state Booking Machine, Counter-Offers)

4. 🔐 **Auth Service (Node.js/Express - Port 3001)**:
   - पाथ: [`services/auth-service/src/`](file:///c:/AI%20Coding%20Challenge%20Platform/BookMe/services/auth-service/src)
   - फाइल्स: **28 फाइल्स** (User registration, Dual phone/email auth, OTP, Token rotation, Agreements)

5. 💳 **Payment & Feedback Service (Node.js/Express - Port 3004)**:
   - पाथ: [`services/payment-feedback-service/src/`](file:///c:/AI%20Coding%20Challenge%20Platform/BookMe/services/payment-feedback-service/src)
   - फाइल्स: **28 फाइल्स** (Payments, Vendor Payouts, Customer Reviews, Complaints)

6. ⚙️ **Admin Service (Node.js/Express - Port 3005)**:
   - पाथ: [`services/admin-service/src/`](file:///c:/AI%20Coding%20Challenge%20Platform/BookMe/services/admin-service/src)
   - फाइल्स: **10 फाइल्स** (Admin configurations, Immutable audit logs, Enforcement ladder)

---

### 🚀 प्रोजेक्ट को रन करने के तरीके (How to Run):
- **1-Click Launch (Recommended):**
  प्रोजेक्ट रूट में [run-all.bat](file:///c:/AI%20Coding%20Challenge%20Platform/BookMe/run-all.bat) पर डबल-क्लिक करें या PowerShell में `.\run-all.ps1` चलाएँ।
- **Root NPM Commands:**
  - `npm run dev:frontend` (फ्रंटएंड स्टार्ट करें)
  - `npm run dev:vendor` (वेंडर सर्विस स्टार्ट करें)
  - `npm run dev:booking` (इवेंट बुकिंग सर्विस स्टार्ट करें)
