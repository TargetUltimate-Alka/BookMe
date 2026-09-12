const { initPasswordToggles, setButtonLoading, showAlert, hideAlert, redirectIfLoggedIn } = window.authStore;

redirectIfLoggedIn();
initPasswordToggles();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;

const form = document.getElementById("vendorRegisterForm");
const alertBox = document.getElementById("alertBox");
const submitBtn = document.getElementById("vendorRegisterBtn");

function setFieldError(id, message) {
  document.getElementById(id).textContent = message || "";
}

function validate({ name, email, phone, password, confirmPassword }) {
  let valid = true;

  ["nameError", "emailError", "phoneError", "passwordError", "confirmPasswordError"].forEach((id) =>
    setFieldError(id, "")
  );

  if (!name.trim()) {
    setFieldError("nameError", "Business / contact name is required");
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

  setButtonLoading(submitBtn, true);

  try {
    // role is fixed to VENDOR here — there is no UI control that lets
    // a user pick ADMIN or any other role on this page.
    await window.api.register({ ...payload, role: "VENDOR" });
    window.location.href = "login.html?registered=1";
  } catch (err) {
    showAlert(alertBox, err.message || "Registration failed. Please try again.");
  } finally {
    setButtonLoading(submitBtn, false);
  }
});
