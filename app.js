// Load from localStorage backup if available, otherwise fall back to window.students from data.js
const cachedStudents = localStorage.getItem("aetheris_students_backup");
if (cachedStudents) {
  try {
    window.students = JSON.parse(cachedStudents);
  } catch (e) {
    console.error("Failed to parse cached students:", e);
  }
}

let localStudents = [];
let selectedStudentId = null;

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  if (path.includes("teacher.html")) {
    initTeacherPortal();
  } else if (path.includes("parent.html")) {
    initParentPortal();
  }
});

function saveToLocalBackup() {
  try {
    localStorage.setItem("aetheris_students_backup", JSON.stringify(window.students));
  } catch (e) {
    console.error("Failed to save to local backup:", e);
  }
}

// ==========================================
// HELPER: Get token from localStorage only
// ==========================================

function getToken() {
  return localStorage.getItem("aetheris_pat") || "";
}

function setToken(raw) {
  // Store only in browser localStorage — NEVER written to GitHub
  localStorage.setItem("aetheris_pat", raw);
}

// Build the data.js content for saving to GitHub — token fields are always EMPTY
function buildDataJsContent() {
  const safeConfig = {
    token_part1: "",  // Never persisted to GitHub
    token_part2: "",  // Never persisted to GitHub
    owner: window.GITHUB_CONFIG.owner,
    repo: window.GITHUB_CONFIG.repo,
    branch: window.GITHUB_CONFIG.branch,
    path: window.GITHUB_CONFIG.path
  };

  return `// Student Management System - Data Store
// This file is read and written dynamically using the GitHub API.

window.TEACHER_PASSWORD = ${JSON.stringify(window.TEACHER_PASSWORD, null, 2)};

window.GITHUB_CONFIG = ${JSON.stringify(safeConfig, null, 2)};

window.students = ${JSON.stringify(localStudents, null, 2)};
`;
}

// ==========================================
// Fetch absolute latest data.js from GitHub API
// ==========================================
async function fetchLatestStudents() {
  const config = window.GITHUB_CONFIG;
  if (!config || !config.owner || !config.repo || config.owner.startsWith("YOUR_") || config.repo.startsWith("YOUR_")) {
    return null; // Not configured yet
  }

  const token = getToken();
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${config.branch}&_=${Date.now()}`;
  
  let response;
  const publicHeaders = { "Accept": "application/vnd.github.v3+json" };

  try {
    if (token) {
      // Try with token first to leverage higher rate limits
      response = await fetch(url, { 
        headers: { 
          "Accept": "application/vnd.github.v3+json",
          "Authorization": `token ${token}`
        }, 
        cache: "no-store" 
      });
      // If unauthorized (invalid/revoked token), retry without token
      if (response.status === 401) {
        console.warn("GitHub token returned 401 (invalid/revoked). Retrying without token...");
        response = await fetch(url, { headers: publicHeaders, cache: "no-store" });
      }
    } else {
      response = await fetch(url, { headers: publicHeaders, cache: "no-store" });
    }

    if (!response.ok) {
      console.warn(`Failed to fetch live database. Status: ${response.status}`);
      return null;
    }

    const fileData = await response.json();
    const binaryString = atob(fileData.content.replace(/\s/g, ''));
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const fileContent = new TextDecoder("utf-8").decode(bytes);

    const match = fileContent.match(/window\.students\s*=\s*(\[[\s\S]*\])/);
    if (match) {
      const parsed = JSON.parse(match[1]);
      // Update local storage backup with the fresh data
      window.students = parsed;
      saveToLocalBackup();
      return parsed;
    }
  } catch (err) {
    console.warn("Error loading latest student data from GitHub:", err);
  }
  return null;
}

// ==========================================
// 1. TEACHER PORTAL LOGIC
// ==========================================

function initTeacherPortal() {
  const isAuth = sessionStorage.getItem("teacher_auth") === "true";
  const loginContainer = document.getElementById("login-container");

  if (isAuth) {
    showTeacherDashboard();
  } else if (loginContainer) {
    loginContainer.style.display = "block";
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const pwd = document.getElementById("password").value;
      if (pwd === window.TEACHER_PASSWORD) {
        sessionStorage.setItem("teacher_auth", "true");
        showTeacherDashboard();
      } else {
        const err = document.getElementById("login-error");
        if (err) {
          err.style.display = "flex";
          setTimeout(() => err.style.display = "none", 3000);
        }
      }
    });
  }

  const searchBar = document.getElementById("search-bar");
  if (searchBar) {
    searchBar.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      filterStudents(query);
      const exactMatch = localStudents.find(s => s.first_name.toLowerCase() === query);
      if (exactMatch) selectStudent(exactMatch.id);
    });
  }
}

async function showTeacherDashboard() {
  const loginContainer = document.getElementById("login-container");
  const navHeader = document.getElementById("nav-header");
  const dbContainer = document.getElementById("dashboard-container");

  if (loginContainer) loginContainer.style.display = "none";
  if (navHeader) navHeader.style.display = "flex";
  if (dbContainer) dbContainer.style.display = "grid";

  // 1. Load the initial/cached student list first so dashboard is instant
  localStudents = [...window.students];
  renderStudentList();

  const cfgOwner = document.getElementById("cfg-owner");
  const cfgRepo = document.getElementById("cfg-repo");
  if (cfgOwner) cfgOwner.value = window.GITHUB_CONFIG.owner;
  if (cfgRepo) cfgRepo.value = window.GITHUB_CONFIG.repo;

  const tokenInput = document.getElementById("cfg-token");
  if (getToken() && tokenInput) {
    tokenInput.placeholder = "Configured (Enter new to overwrite)";
  }

  checkGitHubConfig();

  // 2. Fetch the absolute latest students array from GitHub in the background
  const listEl = document.getElementById("student-list");
  if (listEl) {
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "sidebar-syncing-indicator";
    loadingDiv.style.cssText = "padding: 0.6rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;";
    loadingDiv.innerHTML = `<span class="spinner"></span> Syncing latest data...`;
    listEl.parentNode.insertBefore(loadingDiv, listEl);
  }

  try {
    const latestStudents = await fetchLatestStudents();
    if (latestStudents) {
      window.students = latestStudents;
      localStudents = [...latestStudents];
    }
  } catch (err) {
    console.warn("Failed background database sync:", err);
  } finally {
    const indicator = document.getElementById("sidebar-syncing-indicator");
    if (indicator) indicator.remove();
    renderStudentList();
    if (selectedStudentId !== null) {
      selectStudent(selectedStudentId);
    }
  }
}

function checkGitHubConfig() {
  const config = window.GITHUB_CONFIG;
  const warning = document.getElementById("config-warning");
  const hasToken = !!getToken();

  if (warning) {
    if (!hasToken) {
      warning.innerHTML = "Action required: Enter your GitHub PAT Token in the settings panel below and click Update & Sync Config.";
      warning.style.display = "flex";
    } else {
      warning.style.display = "none";
    }
  }
}

function logout() {
  sessionStorage.removeItem("teacher_auth");
  sessionStorage.removeItem("parent_auth");
  sessionStorage.removeItem("parent_child_id");
  window.location.reload();
}

function renderStudentList() {
  const listEl = document.getElementById("student-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  localStudents.forEach(student => {
    const li = document.createElement("li");
    li.className = `student-item ${selectedStudentId === student.id ? "active" : ""}`;
    li.setAttribute("data-id", student.id);
    li.onclick = () => selectStudent(student.id);
    li.innerHTML = `
      <span class="name">${student.first_name}</span>
      <span class="id-num">${student.id_number}</span>
    `;
    listEl.appendChild(li);
  });
}

function filterStudents(query) {
  document.querySelectorAll(".student-item").forEach(item => {
    const name = item.querySelector(".name").textContent.toLowerCase();
    item.style.display = name.includes(query) ? "flex" : "none";
  });
}

function selectStudent(id) {
  selectedStudentId = id;

  document.querySelectorAll(".student-item").forEach(item => {
    if (parseInt(item.getAttribute("data-id")) === id) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  const student = localStudents.find(s => s.id === id);
  if (student) {
    ensureObservationsArray(student);

    const noSel = document.getElementById("no-selection-panel");
    const detail = document.getElementById("student-detail-panel");
    if (noSel) noSel.style.display = "none";
    if (detail) detail.style.display = "block";

    const sName = document.getElementById("student-name");
    const sId = document.getElementById("student-id");
    if (sName) sName.textContent = student.first_name;
    if (sId) sId.textContent = student.id_number;

    renderObservationHistory(student);

    const textInput = document.getElementById("new-observation-text");
    if (textInput) textInput.value = "";

    const statusEl = document.getElementById("save-status");
    if (statusEl) statusEl.style.display = "none";
  }
}

function ensureObservationsArray(student) {
  if (!student.observations) {
    student.observations = [];
    if (student.notes && student.notes.trim() !== "") {
      student.observations.push({ date: "Previous Note", text: student.notes });
      delete student.notes;
    }
  }
}

// Tracks which observation index is being edited in the modal
let editingObsIndex = null;

function renderObservationHistory(student) {
  const el = document.getElementById("observations-history-list");
  if (!el) return;
  el.innerHTML = "";

  if (student.observations.length === 0) {
    el.innerHTML = `<div style="color:var(--text-muted);font-style:italic;padding:1rem 0;">No observations recorded yet.</div>`;
    return;
  }

  student.observations.forEach((obs, index) => {
    const card = document.createElement("div");
    card.className = "observation-card";

    card.innerHTML = `
      <div class="observation-card-header">
        <div class="observation-date">${obs.date}</div>
        <div class="observation-actions">
          <button class="icon-edit-btn" onclick="openObsModal(${index})" title="Edit this observation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-delete-btn" onclick="deleteObservation(${index})" title="Delete this observation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>
      <div class="observation-text">${obs.text}</div>
    `;
    el.appendChild(card);
  });

  el.scrollTop = el.scrollHeight;
}

// ---- Observation Edit Modal ----

function openObsModal(index) {
  const student = localStudents.find(s => s.id === selectedStudentId);
  if (!student) return;
  editingObsIndex = index;
  const obs = student.observations[index];

  const modal = document.getElementById("edit-obs-modal");
  const dateLabel = document.getElementById("edit-obs-date-label");
  const textarea = document.getElementById("modal-obs-textarea");
  const status = document.getElementById("modal-obs-status");

  if (dateLabel) dateLabel.textContent = `Date: ${obs.date}`;
  if (textarea) { textarea.value = obs.text; }
  if (status) status.style.display = "none";
  if (modal) modal.style.display = "flex";
  setTimeout(() => { if (textarea) textarea.focus(); }, 100);
}

function closeObsModal(e) {
  if (e && e.target !== document.getElementById("edit-obs-modal")) return;
  const modal = document.getElementById("edit-obs-modal");
  if (modal) modal.style.display = "none";
  editingObsIndex = null;
}

function saveObsModal() {
  if (editingObsIndex === null) return;
  const textarea = document.getElementById("modal-obs-textarea");
  const status = document.getElementById("modal-obs-status");
  const newText = textarea ? textarea.value.trim() : "";

  if (newText === "") {
    if (status) { status.className = "status-msg error"; status.style.display = "flex"; status.textContent = "Observation text cannot be empty."; }
    return;
  }

  const student = localStudents.find(s => s.id === selectedStudentId);
  if (student) {
    student.observations[editingObsIndex].text = newText;
    const modal = document.getElementById("edit-obs-modal");
    if (modal) modal.style.display = "none";
    editingObsIndex = null;
    
    // Update global state and save local storage backup immediately
    window.students = [...localStudents];
    saveToLocalBackup();
    
    renderObservationHistory(student);
    syncDatabase();
  }
}

function deleteObservation(index) {
  if (!confirm("Are you sure you want to delete this observation? This cannot be undone.")) return;
  const student = localStudents.find(s => s.id === selectedStudentId);
  if (student) {
    student.observations.splice(index, 1);
    
    window.students = [...localStudents];
    saveToLocalBackup();
    
    renderObservationHistory(student);
    syncDatabase();
  }
}

// ---- Password Edit Modal ----

function openPasswordModal() {
  const student = localStudents.find(s => s.id === selectedStudentId);
  if (!student) return;
  const modal = document.getElementById("password-modal");
  const input = document.getElementById("modal-password-input");
  const status = document.getElementById("modal-password-status");
  if (input) input.value = student.id_number;
  if (status) status.style.display = "none";
  if (modal) modal.style.display = "flex";
  setTimeout(() => { if (input) { input.select(); } }, 100);
}

function closePasswordModal(e) {
  if (e && e.target !== document.getElementById("password-modal")) return;
  const modal = document.getElementById("password-modal");
  if (modal) modal.style.display = "none";
}

function saveStudentPassword() {
  if (selectedStudentId === null) return;
  const input = document.getElementById("modal-password-input");
  const status = document.getElementById("modal-password-status");
  if (!input || !status) return;

  const newPassword = input.value.trim();
  if (newPassword === "") {
    status.className = "status-msg error"; status.style.display = "flex";
    status.textContent = "Password cannot be empty."; return;
  }

  const duplicate = localStudents.find(s => s.id !== selectedStudentId && s.id_number.toLowerCase() === newPassword.toLowerCase());
  if (duplicate) {
    status.className = "status-msg error"; status.style.display = "flex";
    status.textContent = `"${newPassword}" is already used by another student.`; return;
  }

  const student = localStudents.find(s => s.id === selectedStudentId);
  if (student) {
    student.id_number = newPassword;
    const sId = document.getElementById("student-id");
    if (sId) sId.textContent = newPassword;
    
    // Update global state and save local storage backup immediately
    window.students = [...localStudents];
    saveToLocalBackup();
    
    renderStudentList();

    status.className = "status-msg info"; status.style.display = "flex";
    status.innerHTML = `<span class="spinner"></span> Saving...`;

    syncDatabase().then(() => {
      status.className = "status-msg success";
      status.textContent = `Password updated to "${newPassword}"!`;
      setTimeout(() => {
        const modal = document.getElementById("password-modal");
        if (modal) modal.style.display = "none";
      }, 1800);
    }).catch(err => {
      status.className = "status-msg error";
      status.textContent = `Sync failed: ${err.message}`;
    });
  }
}

function showAddStudentModal() {
  const modal = document.getElementById("add-student-modal");
  if (modal) modal.style.display = "flex";
}

function closeAddStudentModal() {
  const modal = document.getElementById("add-student-modal");
  const form = document.getElementById("add-student-form");
  if (modal) modal.style.display = "none";
  if (form) form.reset();
}

function handleAddStudent(e) {
  e.preventDefault();
  const first_name = document.getElementById("new-first-name").value.trim();
  const id_number = document.getElementById("new-id-number").value.trim();
  const initialObs = document.getElementById("new-initial-observation").value.trim();

  if (localStudents.some(s => s.id_number.toLowerCase() === id_number.toLowerCase())) {
    alert("A student with this ID number already exists!");
    return;
  }

  const newId = localStudents.length > 0 ? Math.max(...localStudents.map(s => s.id)) + 1 : 1;
  const newStudent = { id: newId, first_name, id_number, observations: [] };

  if (initialObs !== "") {
    newStudent.observations.push({ date: new Date().toLocaleString(), text: initialObs });
  }

  localStudents.push(newStudent);
  
  // Update global state and save local storage backup immediately
  window.students = [...localStudents];
  saveToLocalBackup();
  
  renderStudentList();
  closeAddStudentModal();
  selectStudent(newId);
  syncDatabase();
}

function addNewObservation() {
  if (selectedStudentId === null) return;

  const textInput = document.getElementById("new-observation-text");
  if (!textInput) return;
  const textVal = textInput.value.trim();

  if (textVal === "") {
    alert("Please enter observation text before saving!");
    return;
  }

  const student = localStudents.find(s => s.id === selectedStudentId);
  if (student) {
    ensureObservationsArray(student);
    student.observations.push({ date: new Date().toLocaleString(), text: textVal });
    textInput.value = "";
    
    // Update global state and save local storage backup immediately
    window.students = [...localStudents];
    saveToLocalBackup();
    
    renderObservationHistory(student);
    syncDatabase();
  }
}

async function updateGitHubSettings() {
  const owner = document.getElementById("cfg-owner").value.trim();
  const repo = document.getElementById("cfg-repo").value.trim();
  const rawToken = document.getElementById("cfg-token").value.trim();
  const statusEl = document.getElementById("cfg-status");

  if (!statusEl) return;
  statusEl.className = "status-msg info";
  statusEl.style.display = "flex";
  statusEl.textContent = "Saving settings...";

  if (!owner || !repo) {
    statusEl.className = "status-msg error";
    statusEl.textContent = "Error: Username and Repo Name are required.";
    return;
  }

  window.GITHUB_CONFIG.owner = owner;
  window.GITHUB_CONFIG.repo = repo;

  // Save token ONLY to localStorage — never to the file
  if (rawToken !== "") {
    setToken(rawToken);
  }

  if (!getToken()) {
    statusEl.className = "status-msg error";
    statusEl.textContent = "Error: GitHub PAT Token is required.";
    return;
  }

  try {
    await syncDatabase();
    statusEl.className = "status-msg success";
    statusEl.textContent = "Success: Settings saved! Token stored in browser only.";

    const tokenInput = document.getElementById("cfg-token");
    if (tokenInput) {
      tokenInput.value = "";
      tokenInput.placeholder = "Configured (Enter new to overwrite)";
    }

    checkGitHubConfig();
    setTimeout(() => { statusEl.style.display = "none"; }, 5000);
  } catch (error) {
    statusEl.className = "status-msg error";
    statusEl.textContent = `Error: ${error.message}`;
  }
}

// ==========================================
// GITHUB SYNC — Token NEVER written to file
// ==========================================

async function syncDatabase() {
  const statusEl = document.getElementById("save-status");
  if (statusEl) {
    statusEl.className = "status-msg info";
    statusEl.style.display = "flex";
    statusEl.innerHTML = `<span class="spinner"></span> Syncing with GitHub...`;
  }

  const config = window.GITHUB_CONFIG;
  const token = getToken();

  if (!token) {
    const msg = "GitHub PAT Token is missing. Enter it in the settings panel.";
    if (statusEl) { statusEl.className = "status-msg error"; statusEl.style.display = "flex"; statusEl.textContent = `Error: ${msg}`; }
    throw new Error(msg);
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;

  try {
    // Cache-bust with timestamp so we always get the latest SHA from GitHub
    const bust = `?ref=${config.branch}&_=${Date.now()}`;
    const getResponse = await fetch(`${url}${bust}`, {
      cache: "no-store",
      headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github.v3+json" }
    });

    let sha = null;
    if (getResponse.ok) {
      sha = (await getResponse.json()).sha;
    } else if (getResponse.status !== 404) {
      throw new Error(`Failed to fetch file metadata. Status: ${getResponse.status}`);
    }

    // Build the content to commit — token fields are ALWAYS empty in the file
    const fileContent = buildDataJsContent();
    const utf8Bytes = new TextEncoder().encode(fileContent);
    const base64Content = btoa(String.fromCharCode(...utf8Bytes));

    const putBody = { message: "Update student database (Aetheris CMS)", content: base64Content, branch: config.branch };
    if (sha) putBody.sha = sha;

    const putResponse = await fetch(url, {
      method: "PUT",
      headers: { "Authorization": `token ${token}`, "Content-Type": "application/json", "Accept": "application/vnd.github.v3+json" },
      body: JSON.stringify(putBody)
    });

    if (!putResponse.ok) {
      const errBody = await putResponse.json();
      // If SHA mismatch, fetch the fresh SHA and retry once automatically
      if (putResponse.status === 409 || (errBody.message && errBody.message.includes("does not match"))) {
        const retryGet = await fetch(`${url}?ref=${config.branch}&_=${Date.now()}`, {
          cache: "no-store",
          headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github.v3+json" }
        });
        if (retryGet.ok) {
          const freshSha = (await retryGet.json()).sha;
          putBody.sha = freshSha;
          const retryPut = await fetch(url, {
            method: "PUT",
            headers: { "Authorization": `token ${token}`, "Content-Type": "application/json", "Accept": "application/vnd.github.v3+json" },
            body: JSON.stringify(putBody)
          });
          if (!retryPut.ok) {
            const retryErr = await retryPut.json();
            throw new Error(retryErr.message || "Retry failed to write file back to GitHub.");
          }
          // Retry succeeded — fall through to success handling
          if (statusEl) { statusEl.className = "status-msg success"; statusEl.style.display = "flex"; statusEl.textContent = "Success: Saved and Synced to GitHub!"; }
          window.students = [...localStudents];
          return;
        }
      }
      throw new Error(errBody.message || "Failed to write file back to GitHub.");
    }

    if (statusEl) { statusEl.className = "status-msg success"; statusEl.style.display = "flex"; statusEl.textContent = "Success: Saved and Synced to GitHub!"; }
    window.students = [...localStudents];

  } catch (error) {
    console.error("GitHub Sync Error:", error);
    if (statusEl) { statusEl.className = "status-msg error"; statusEl.style.display = "flex"; statusEl.textContent = `Error: ${error.message}`; }
    throw error;
  }
}

// ==========================================
// 2. PARENT PORTAL LOGIC
// ==========================================

function initParentPortal() {
  const isAuth = sessionStorage.getItem("parent_auth") === "true";
  const studentId = sessionStorage.getItem("parent_child_id");
  const loginContainer = document.getElementById("login-container");

  if (isAuth && studentId) {
    showParentDashboard(parseInt(studentId));
  } else if (loginContainer) {
    loginContainer.style.display = "block";
  }

  const parentLoginForm = document.getElementById("parent-login-form");
  if (parentLoginForm) {
    parentLoginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const statusEl = document.getElementById("login-error");
      if (statusEl) {
        statusEl.className = "status-msg info";
        statusEl.style.display = "flex";
        statusEl.innerHTML = `<span class="spinner"></span> Verifying credentials...`;
      }

      try {
        const latestStudents = await fetchLatestStudents();
        if (latestStudents) {
          window.students = latestStudents;
        }
      } catch (err) {
        console.warn("Could not retrieve latest data, fallback to local:", err);
      }

      const username = document.getElementById("parent-username").value.trim().toLowerCase();
      const password = document.getElementById("parent-password").value.trim();

      const student = window.students.find(s =>
        s.first_name.toLowerCase() === username &&
        s.id_number.toLowerCase() === password.toLowerCase()
      );

      if (student) {
        if (statusEl) statusEl.style.display = "none";
        sessionStorage.setItem("parent_auth", "true");
        sessionStorage.setItem("parent_child_id", student.id);
        showParentDashboard(student.id);
      } else {
        if (statusEl) {
          statusEl.className = "status-msg error";
          statusEl.style.display = "flex";
          statusEl.textContent = "Error: Invalid username or password.";
          setTimeout(() => statusEl.style.display = "none", 4000);
        }
      }
    });
  }
}

async function showParentDashboard(studentId) {
  const loginContainer = document.getElementById("login-container");
  const dbContainer = document.getElementById("dashboard-container");
  if (loginContainer) loginContainer.style.display = "none";
  if (dbContainer) dbContainer.style.display = "block";

  // 1. Immediately render initial data so portal feels snappy
  renderParentData(studentId);

  // 2. Fetch fresh updates directly from GitHub in the background
  try {
    const latestStudents = await fetchLatestStudents();
    if (latestStudents) {
      window.students = latestStudents;
      renderParentData(studentId);
    }
  } catch (err) {
    console.warn("Background parent data sync failed:", err);
  }
}

function renderParentData(studentId) {
  const student = window.students.find(s => s.id === studentId);
  if (!student) { logout(); return; }

  const childName = document.getElementById("child-name");
  const childId = document.getElementById("child-id");
  const notesEl = document.getElementById("notes-content");
  if (childName) childName.textContent = student.first_name;
  if (childId) childId.textContent = student.id_number;

  if (notesEl) {
    notesEl.innerHTML = "";
    let observations = student.observations || [];
    if (observations.length === 0 && student.notes && student.notes.trim() !== "") {
      observations = [{ date: "Previous Note", text: student.notes }];
    }

    if (observations.length === 0) {
      notesEl.innerHTML = `<div class="notes-display-box" style="display:flex;align-items:center;justify-content:center;"><em style="color:var(--text-muted);">No observations have been recorded for your child yet.</em></div>`;
    } else {
      const historyDiv = document.createElement("div");
      historyDiv.className = "observations-history";
      historyDiv.style.maxHeight = "400px";
      observations.forEach(obs => {
        const card = document.createElement("div");
        card.className = "observation-card";
        card.innerHTML = `<div class="observation-date">${obs.date}</div><div class="observation-text">${obs.text}</div>`;
        historyDiv.appendChild(card);
      });
      notesEl.appendChild(historyDiv);
      historyDiv.scrollTop = historyDiv.scrollHeight;
    }
  }
}
