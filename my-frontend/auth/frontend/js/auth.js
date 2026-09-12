// Handles everything about "being logged in" on the frontend:
// storing/reading the JWT + user object, guarding pages, and
// figuring out where each role should land after login.

const TOKEN_KEY = "bookme_token";
const USER_KEY = "bookme_user";

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function isLoggedIn() {
  return Boolean(getToken());
}

// Redirects a freshly logged-in user to the right dashboard.
function redirectToDashboard(role) {
  window.location.href = "dashboard.html";
}

// Call at the top of any page that requires a logged-in user.
// Optionally restrict to specific roles, e.g. requireAuthPage(["ADMIN"])
function requireAuthPage(allowedRoles) {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }
  const user = getUser();
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    window.location.href = "dashboard.html";
  }
}

// Call at the top of login/register pages so an already-logged-in
// user doesn't see the login form again.
function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = "dashboard.html";
  }
}

async function logoutAndRedirect() {
  try {
    await window.api.logout();
  } catch (err) {
    // Even if the network call fails, we still clear the local session —
    // logout must always work from the user's point of view.
    console.warn("Logout API call failed, clearing session locally anyway.");
  }
  clearSession();
  window.location.href = "login.html";
}

// Wires up every button.password-toggle on the page to show/hide
// the password input it points at (via data-target="<input id>").
function initPasswordToggles() {
  document.querySelectorAll(".password-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.textContent = isHidden ? "HIDE" : "SHOW";
    });
  });
}

// Toggles the loading state (spinner + disabled) on a submit button.
function setButtonLoading(button, isLoading) {
  button.disabled = isLoading;
  button.classList.toggle("loading", isLoading);
}

function showAlert(alertEl, message) {
  alertEl.textContent = message;
  alertEl.classList.add("show");
}

function hideAlert(alertEl) {
  alertEl.classList.remove("show");
  alertEl.textContent = "";
}

window.authStore = {
  setSession,
  getToken,
  getUser,
  clearSession,
  isLoggedIn,
  redirectToDashboard,
  requireAuthPage,
  redirectIfLoggedIn,
  logoutAndRedirect,
  initPasswordToggles,
  setButtonLoading,
  showAlert,
  hideAlert,
};
