const { requireAuthPage, getUser, setSession, getToken, logoutAndRedirect } = window.authStore;

requireAuthPage();
document.getElementById("logoutBtn").addEventListener("click", logoutAndRedirect);

const container = document.getElementById("profileContainer");
const PHONE_REGEX = /^[0-9]{10}$/;

function renderProfile(user) {
  container.innerHTML = `
    <div class="profile-grid">
      <div class="profile-summary">
        <div class="profile-avatar">${user.name.charAt(0).toUpperCase()}</div>
        <h2>${user.name}</h2>
        <div class="email">${user.email}</div>
        <span class="role-badge ${user.role}">${user.role}</span>
        <div>
          <span class="status-pill ${user.status}">${user.status}</span>
        </div>
      </div>

      <div class="profile-form-card">
        <h3>Edit profile</h3>
        <div id="alertBox" class="alert alert-error"></div>
        <div id="successBox" class="alert alert-success"></div>

        <form id="profileForm" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="name">Full name</label>
              <input type="text" id="name" value="${user.name}" />
              <div class="field-error" id="nameError"></div>
            </div>
            <div class="form-group">
              <label for="phone">Phone number</label>
              <input type="tel" id="phone" maxlength="10" value="${user.phone || ""}" />
              <div class="field-error" id="phoneError"></div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Email address (not editable)</label>
              <div class="form-static">${user.email}</div>
            </div>
            <div class="form-group">
              <label>Role (not editable)</label>
              <div class="form-static">${user.role}</div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="saveBtn" style="width:auto; padding:12px 24px;">
              <span class="spinner"></span>
              <span class="btn-label">Save changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const { setButtonLoading, showAlert, hideAlert } = window.authStore;
  const form = document.getElementById("profileForm");
  const alertBox = document.getElementById("alertBox");
  const successBox = document.getElementById("successBox");
  const saveBtn = document.getElementById("saveBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(alertBox);
    successBox.classList.remove("show");

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();

    document.getElementById("nameError").textContent = "";
    document.getElementById("phoneError").textContent = "";

    let valid = true;
    if (!name) {
      document.getElementById("nameError").textContent = "Name cannot be empty";
      valid = false;
    }
    if (!PHONE_REGEX.test(phone)) {
      document.getElementById("phoneError").textContent = "Enter a valid 10-digit phone number";
      valid = false;
    }
    if (!valid) return;

    setButtonLoading(saveBtn, true);

    try {
      const res = await window.api.updateUser(user.id, { name, phone });
      setSession(getToken(), res.data); // refresh cached user with the new name/phone
      successBox.textContent = "Profile updated successfully.";
      successBox.classList.add("show");
      renderProfile(res.data); // re-render summary card with fresh data
    } catch (err) {
      showAlert(alertBox, err.message || "Could not update profile.");
    } finally {
      setButtonLoading(saveBtn, false);
    }
  });
}

async function loadProfile() {
  const cachedUser = getUser();
  try {
    // Always fetch the latest copy from the server rather than trusting
    // whatever was cached at login time.
    const res = await window.api.getUser(cachedUser.id);
    renderProfile(res.data);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error show">Could not load your profile: ${err.message}</div>`;
  }
}

loadProfile();
