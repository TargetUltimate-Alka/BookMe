const { initPasswordToggles, setButtonLoading, showAlert, hideAlert, redirectIfLoggedIn } = window.authStore;

redirectIfLoggedIn();
initPasswordToggles();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;

const form = document.getElementById("registerForm");
const alertBox = document.getElementById("alertBox");
const registerBtn = document.getElementById("registerBtn");

function setFieldError(id, message) {
  document.getElementById(id).textContent = message || "";
}

function validate({ name, email, phone, password, confirmPassword }) {
  let valid = true;

  setFieldError("nameError", "");
  setFieldError("emailError", "");
  setFieldError("phoneError", "");
  setFieldError("passwordError", "");
  setFieldError("confirmPasswordError", "");

  if (!name.trim()) {
    setFieldError("nameError", "Name is required");
    valid = false;
  }
  if (!EMAIL_REGEX.test(email)) {
    setFieldError("emailError", "Enter a valid email address");
    valid = false;
  }
  if (!PHONE_REGEX.test(phone)) {
    setFieldError("phoneError", "Enter a valid 10-digit phone number");
    valid = false;
  }
  if (password.length < 6) {
    setFieldError("passwordError", "Password must be at least 6 characters");
    valid = false;
  }
  if (password !== confirmPassword) {
    setFieldError("confirmPasswordError", "Passwords do not match");
    valid = false;
  }

  return valid;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert(alertBox);

  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    password: document.getElementById("password").value,
    confirmPassword: document.getElementById("confirmPassword").value,
  };

  if (!validate(payload)) return;

  setButtonLoading(registerBtn, true);

  try {
    await window.api.register({ ...payload, role: "CUSTOMER" });
    window.location.href = "login.html?registered=1";
  } catch (err) {
    showAlert(alertBox, err.message || "Registration failed. Please try again.");
  } finally {
    setButtonLoading(registerBtn, false);
  }
});
