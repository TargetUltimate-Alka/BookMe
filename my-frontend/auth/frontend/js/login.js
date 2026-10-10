const { redirectIfLoggedIn, setSession, initPasswordToggles, setButtonLoading, showAlert, hideAlert } =
  window.authStore;

redirectIfLoggedIn(); // if already logged in, skip straight to dashboard
initPasswordToggles();

const form = document.getElementById("loginForm");
const alertBox = document.getElementById("alertBox");
const loginBtn = document.getElementById("loginBtn");

function validate(email, password) {
  let valid = true;
  document.getElementById("emailError").textContent = "";
  document.getElementById("passwordError").textContent = "";

  if (!email) {
    document.getElementById("emailError").textContent = "Email is required";
    valid = false;
  }
  if (!password) {
    document.getElementById("passwordError").textContent = "Password is required";
    valid = false;
  }
  return valid;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert(alertBox);

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!validate(email, password)) return;

  setButtonLoading(loginBtn, true);

  try {
    const res = await window.api.login({ email, password });
    setSession(res.token, res.user);
    window.location.href = "dashboard.html"; // dashboard.js renders per-role content
  } catch (err) {
    showAlert(alertBox, err.message || "Login failed. Please try again.");
  } finally {
    setButtonLoading(loginBtn, false);
  }
});
