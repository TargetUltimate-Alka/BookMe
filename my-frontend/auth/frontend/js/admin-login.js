const { redirectIfLoggedIn, setSession, clearSession, initPasswordToggles, setButtonLoading, showAlert, hideAlert } =
  window.authStore;

redirectIfLoggedIn();
initPasswordToggles();

const form = document.getElementById("adminLoginForm");
const alertBox = document.getElementById("alertBox");
const loginBtn = document.getElementById("adminLoginBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert(alertBox);

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showAlert(alertBox, "Email and password are required");
    return;
  }

  setButtonLoading(loginBtn, true);

  try {
    // Same /auth/login endpoint as customers/vendors — the backend
    // doesn't have a separate "admin login" API. This page just
    // refuses to let a non-admin account in.
    const res = await window.api.login({ email, password });

    if (res.user.role !== "ADMIN") {
      clearSession();
      showAlert(alertBox, "This login is for BookMe administrators only.");
      return;
    }

    setSession(res.token, res.user);
    window.location.href = "dashboard.html";
  } catch (err) {
    showAlert(alertBox, err.message || "Login failed. Please try again.");
  } finally {
    setButtonLoading(loginBtn, false);
  }
});
