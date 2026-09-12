const { requireAuthPage, getUser, logoutAndRedirect } = window.authStore;

requireAuthPage(); // any logged-in role can be on this page

const user = getUser();
document.getElementById("navName").textContent = user.name.split(" ")[0];
document.getElementById("navAvatar").textContent = user.name.charAt(0).toUpperCase();
document.getElementById("logoutBtn").addEventListener("click", logoutAndRedirect);

function placeholderCard(icon, title, comingFrom) {
  return `
    <div class="dash-card">
      <div class="icon">${icon}</div>
      <h3>${title}</h3>
      <p>This feature is provided by another BookMe microservice.</p>
      <span class="tag-soon">Coming from ${comingFrom}</span>
    </div>`;
}

function activeCard(icon, title, description, href) {
  return `
    <a class="dash-card active" style="text-decoration:none; color:inherit; display:block;" href="${href}">
      <div class="icon">${icon}</div>
      <h3>${title}</h3>
      <p>${description}</p>
    </a>`;
}

function renderCustomerDashboard() {
  return `
    <div class="welcome-banner">
      <h1>Welcome back, ${user.name}! 🎉</h1>
      <p>Here's your BookMe customer dashboard.</p>
    </div>
    <div class="section-title">Your account</div>
    <div class="card-grid">
      ${activeCard("👤", "My Profile", "View and update your account details.", "profile.html")}
      ${placeholderCard("🎪", "My Events", "Vendor Service")}
      ${placeholderCard("🔍", "Find Vendors", "Vendor Service")}
      ${placeholderCard("📖", "My Bookings", "Event/Booking Service")}
    </div>
  `;
}

function renderVendorDashboard() {
  return `
    <div class="welcome-banner">
      <h1>Welcome back, ${user.name}! 📸</h1>
      <p>Manage your BookMe vendor presence from here.</p>
    </div>
    <div class="section-title">Your account</div>
    <div class="card-grid">
      ${activeCard("👤", "My Profile", "View and update your business contact details.", "profile.html")}
      ${placeholderCard("🛠️", "Services", "Vendor Service")}
      ${placeholderCard("📦", "Packages", "Vendor Service")}
      ${placeholderCard("🗓️", "Availability", "Vendor Service")}
      ${placeholderCard("📩", "Booking Requests", "Event/Booking Service")}
      ${placeholderCard("💰", "Earnings", "Payment/Feedback Service")}
    </div>
  `;
}

function renderAdminDashboard() {
  return `
    <div class="welcome-banner" style="background:var(--color-text);">
      <h1>Welcome, Admin ${user.name}! 🛡️</h1>
      <p>BookMe platform overview and management.</p>
    </div>
    <div class="section-title">Your account</div>
    <div class="card-grid">
      ${activeCard("👤", "My Profile", "View and update your admin account details.", "profile.html")}
      ${placeholderCard("👥", "Users", "Auth Service (extended admin APIs)")}
      ${placeholderCard("🏪", "Vendors", "Vendor Service")}
      ${placeholderCard("📖", "Bookings", "Event/Booking Service")}
      ${placeholderCard("💳", "Payments", "Payment/Feedback Service")}
      ${placeholderCard("🚩", "Complaints", "Payment/Feedback Service")}
    </div>
  `;
}

const content = document.getElementById("dashboardContent");

if (user.role === "CUSTOMER") {
  content.innerHTML = renderCustomerDashboard();
} else if (user.role === "VENDOR") {
  content.innerHTML = renderVendorDashboard();
} else if (user.role === "ADMIN") {
  content.innerHTML = renderAdminDashboard();
} else {
  content.innerHTML = `<div class="alert alert-error show">Unknown role. Please log in again.</div>`;
}
