// ==========================================
// Aetheris Portal Systems — Unified App Controller
// ==========================================

// Load cached data from localStorage
try {
  const cs = localStorage.getItem("aetheris_students_backup");
  if (cs) window.students = JSON.parse(cs);
} catch (e) { console.warn("Could not restore students from cache:", e); }

try {
  const csec = localStorage.getItem("aetheris_sections_backup");
  if (csec) window.sections = JSON.parse(csec);
} catch (e) { console.warn("Could not restore sections from cache:", e); }

let localStudents = [];
let selectedStudentId = null;

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  if (path.includes("teacher.html")) initTeacherPortal();
  else if (path.includes("parent.html"))  initParentPortal();
});

// ------------------------------------------
// Local backup helpers
// ------------------------------------------
function saveToLocalBackup() {
  try {
    localStorage.setItem("aetheris_students_backup", JSON.stringify(window.students));
    localStorage.setItem("aetheris_sections_backup", JSON.stringify(window.sections || []));
  } catch (e) { console.error("Backup failed:", e); }
}

// ------------------------------------------
// Token helpers (localStorage only, never committed)
// ------------------------------------------
function getToken() {
  try { return localStorage.getItem("aetheris_pat") || ""; }
  catch (e) { return ""; }
}
function setToken(raw) {
  try { localStorage.setItem("aetheris_pat", raw); }
  catch (e) { console.warn("Could not save token:", e); }
}

// ------------------------------------------
// Build the file content to commit to GitHub
// Token fields are always BLANK in committed file
// ------------------------------------------
function buildDataJsContent() {
  const safeConfig = {
    token_part1: "",
    token_part2: "",
    owner: window.GITHUB_CONFIG.owner,
    repo: window.GITHUB_CONFIG.repo,
    branch: window.GITHUB_CONFIG.branch,
    path: window.GITHUB_CONFIG.path
  };

  return `// Student Management System - Data Store
// This file is read and written dynamically using the GitHub API.

window.TEACHER_PASSWORD = ${JSON.stringify(window.TEACHER_PASSWORD, null, 2)};

window.GITHUB_CONFIG = ${JSON.stringify(safeConfig, null, 2)};

window.sections = ${JSON.stringify(window.sections || [], null, 2)};

window.students = ${JSON.stringify(localStudents, null, 2)};
`;
}

// ------------------------------------------
// Fetch fresh data from GitHub API
// ------------------------------------------
async function fetchLatestStudents() {
  const config = window.GITHUB_CONFIG;
  if (!config || !config.owner || !config.repo ||
      config.owner.startsWith("YOUR_") || config.repo.startsWith("YOUR_")) return null;

  const token = getToken();
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${config.branch}&_=${Date.now()}`;
  const authHeaders = token
    ? { "Accept": "application/vnd.github.v3+json", "Authorization": `token ${token}` }
    : { "Accept": "application/vnd.github.v3+json" };

  try {
    let response = await fetch(url, { headers: authHeaders, cache: "no-store" });
    if (response.status === 401) {
      response = await fetch(url, { headers: { "Accept": "application/vnd.github.v3+json" }, cache: "no-store" });
    }
    if (!response.ok) { console.warn("Fetch failed:", response.status); return null; }

    const fileData = await response.json();
    const raw = atob(fileData.content.replace(/\s/g, ""));
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const fileContent = new TextDecoder("utf-8").decode(bytes);

    // Parse sections
    const secMatch = fileContent.match(/window\.sections\s*=\s*(\[[\s\S]*?\]);/);
    if (secMatch) {
      try { window.sections = JSON.parse(secMatch[1]); } catch (_) {}
    }

    // Parse students
    const stuMatch = fileContent.match(/window\.students\s*=\s*(\[[\s\S]*?\]);/);
    if (stuMatch) {
      const parsed = JSON.parse(stuMatch[1]);
      window.students = parsed;
      saveToLocalBackup();
      return parsed;
    }
  } catch (err) { console.warn("fetchLatestStudents error:", err); }
  return null;
}

// ==========================================
// TEACHER PORTAL — 3 SCREENS:
//  1. Login  →  2. Section Selector  →  3. Dashboard
// ==========================================

function initTeacherPortal() {
  const isAuth = sessionStorage.getItem("teacher_auth") === "true";

  if (isAuth) {
    showSectionSelector();
  } else {
    document.getElementById("login-container").style.display = "block";
  }

  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const pwd = document.getElementById("password").value;
    if (pwd === window.TEACHER_PASSWORD) {
      sessionStorage.setItem("teacher_auth", "true");
      document.getElementById("login-container").style.display = "none";
      showSectionSelector();
    } else {
      const err = document.getElementById("login-error");
      if (err) { err.style.display = "flex"; setTimeout(() => err.style.display = "none", 3000); }
    }
  });

  const searchBar = document.getElementById("search-bar");
  if (searchBar) {
    searchBar.addEventListener("input", (e) => {
      filterStudents(e.target.value.toLowerCase().trim());
    });
  }
}

// ------------------------------------------
// SCREEN 2: Section Selector
// ------------------------------------------
async function showSectionSelector() {
  // Ensure sections exist
  if (!window.sections || window.sections.length === 0) {
    window.sections = ["Section A", "Section B"];
  }

  // Hide login, show section selector
  document.getElementById("login-container").style.display = "none";
  document.getElementById("nav-header").style.display = "none";
  document.getElementById("dashboard-container").style.display = "none";
  document.getElementById("section-select-screen").style.display = "block";

  // Fetch fresh data in background while showing the screen
  renderSectionCards();

  try {
    const latest = await fetchLatestStudents();
    if (latest) {
      localStudents = [...latest];
      renderSectionCards(); // re-render with updated student counts
    }
  } catch (_) {}
}

function renderSectionCards() {
  const grid = document.getElementById("section-cards-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const sections = window.sections || [];
  sections.forEach((sec) => {
    const count = (window.students || []).filter(s => s.section === sec).length;
    const card = document.createElement("div");
    card.className = "section-card";
    card.onclick = () => openDashboardForSection(sec);
    card.innerHTML = `
      <div class="section-card-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <div class="section-card-name">${sec}</div>
      <div class="section-card-count">${count} student${count !== 1 ? "s" : ""}</div>
    `;
    grid.appendChild(card);
  });
}

// ------------------------------------------
// SCREEN 3: Student Dashboard
// ------------------------------------------
function openDashboardForSection(sectionName) {
  window.selectedSection = sectionName;

  // Hide section selector, show dashboard
  document.getElementById("section-select-screen").style.display = "none";

  const navHeader = document.getElementById("nav-header");
  const dbContainer = document.getElementById("dashboard-container");
  navHeader.style.display = "flex";
  dbContainer.style.display = "grid";

  // Show section name in nav
  const label = document.getElementById("nav-section-label");
  if (label) label.textContent = `Currently viewing: ${sectionName}`;

  // Reset selection state
  selectedStudentId = null;
  document.getElementById("no-selection-panel").style.display = "block";
  document.getElementById("student-detail-panel").style.display = "none";

  localStudents = [...(window.students || [])];
  renderStudentList();

  // Fill GitHub config panel
  const cfgOwner = document.getElementById("cfg-owner");
  const cfgRepo = document.getElementById("cfg-repo");
  if (cfgOwner) cfgOwner.value = window.GITHUB_CONFIG.owner;
  if (cfgRepo) cfgRepo.value = window.GITHUB_CONFIG.repo;
  const tokenInput = document.getElementById("cfg-token");
  if (getToken() && tokenInput) tokenInput.placeholder = "Configured (Enter new to overwrite)";

  checkGitHubConfig();
}

function goToSectionSelector() {
  selectedStudentId = null;
  document.getElementById("nav-header").style.display = "none";
  document.getElementById("dashboard-container").style.display = "none";
  showSectionSelector();
}

// ------------------------------------------
// Student list + filtering
// ------------------------------------------
function renderStudentList() {
  const listEl = document.getElementById("student-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const filtered = localStudents.filter(s => s.section === window.selectedSection);

  if (filtered.length === 0) {
    listEl.innerHTML = `<div style="padding:1.2rem;text-align:center;color:var(--text-muted);font-size:0.85rem;">No students in this section yet.<br>Click "+ Add Student" to add one.</div>`;
    return;
  }

  filtered.forEach(student => {
    const li = document.createElement("li");
    li.className = `student-item ${selectedStudentId === student.id ? "active" : ""}`;
    li.setAttribute("data-id", student.id);
    li.onclick = () => selectStudent(student.id);
    li.innerHTML = `<span class="name">${student.first_name}</span><span class="id-num">${student.id_number}</span>`;
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
    item.classList.toggle("active", parseInt(item.getAttribute("data-id")) === id);
  });

  const student = localStudents.find(s => s.id === id);
  if (!student) return;

  ensureObservationsArray(student);

  document.getElementById("no-selection-panel").style.display = "none";
  document.getElementById("student-detail-panel").style.display = "block";

  document.getElementById("student-name").textContent = student.first_name;
  document.getElementById("student-id").textContent = student.id_number;

  renderObservationHistory(student);
  document.getElementById("new-observation-text").value = "";
  const statusEl = document.getElementById("save-status");
  if (statusEl) statusEl.style.display = "none";
}

function ensureObservationsArray(student) {
  if (!student.observations) {
    student.observations = [];
    if (student.notes && student.notes.trim()) {
      student.observations.push({ date: "Previous Note", text: student.notes });
      delete student.notes;
    }
  }
}

// ------------------------------------------
// Observation History
// ------------------------------------------
let editingObsIndex = null;

function renderObservationHistory(student) {
  const el = document.getElementById("observations-history-list");
  if (!el) return;
  el.innerHTML = "";

  if (!student.observations || student.observations.length === 0) {
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
          <button class="icon-edit-btn" onclick="openObsModal(${index})" title="Edit observation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-delete-btn" onclick="deleteObservation(${index})" title="Delete observation">
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

function addNewObservation() {
  if (selectedStudentId === null) return;
  const textInput = document.getElementById("new-observation-text");
  const textVal = textInput ? textInput.value.trim() : "";
  if (!textVal) { alert("Please enter observation text before saving!"); return; }

  const student = localStudents.find(s => s.id === selectedStudentId);
  if (student) {
    ensureObservationsArray(student);
    student.observations.push({ date: new Date().toLocaleString(), text: textVal });
    if (textInput) textInput.value = "";
    window.students = [...localStudents];
    saveToLocalBackup();
    renderObservationHistory(student);
    syncDatabase();
  }
}

// -- Observation edit modal --
function openObsModal(index) {
  const student = localStudents.find(s => s.id === selectedStudentId);
  if (!student) return;
  editingObsIndex = index;
  const obs = student.observations[index];
  document.getElementById("edit-obs-date-label").textContent = `Date: ${obs.date}`;
  document.getElementById("modal-obs-textarea").value = obs.text;
  document.getElementById("modal-obs-status").style.display = "none";
  document.getElementById("edit-obs-modal").style.display = "flex";
  setTimeout(() => document.getElementById("modal-obs-textarea").focus(), 100);
}
function closeObsModal(e) {
  if (e && e.target !== document.getElementById("edit-obs-modal")) return;
  document.getElementById("edit-obs-modal").style.display = "none";
  editingObsIndex = null;
}
function saveObsModal() {
  if (editingObsIndex === null) return;
  const textarea = document.getElementById("modal-obs-textarea");
  const status  = document.getElementById("modal-obs-status");
  const newText = textarea ? textarea.value.trim() : "";
  if (!newText) {
    status.className = "status-msg error"; status.style.display = "flex";
    status.textContent = "Observation text cannot be empty."; return;
  }
  const student = localStudents.find(s => s.id === selectedStudentId);
  if (student) {
    student.observations[editingObsIndex].text = newText;
    document.getElementById("edit-obs-modal").style.display = "none";
    editingObsIndex = null;
    window.students = [...localStudents];
    saveToLocalBackup();
    renderObservationHistory(student);
    syncDatabase();
  }
}
function deleteObservation(index) {
  if (!confirm("Delete this observation? This cannot be undone.")) return;
  const student = localStudents.find(s => s.id === selectedStudentId);
  if (student) {
    student.observations.splice(index, 1);
    window.students = [...localStudents];
    saveToLocalBackup();
    renderObservationHistory(student);
    syncDatabase();
  }
}

// ------------------------------------------
// Add Section Modal
// ------------------------------------------
function openAddSectionModal() {
  document.getElementById("new-section-input").value = "";
  document.getElementById("modal-section-status").style.display = "none";
  document.getElementById("add-section-modal").style.display = "flex";
  setTimeout(() => document.getElementById("new-section-input").focus(), 100);
}
function closeAddSectionModal(e) {
  if (e && e.target !== document.getElementById("add-section-modal")) return;
  document.getElementById("add-section-modal").style.display = "none";
}
function handleAddSection() {
  const input  = document.getElementById("new-section-input");
  const status = document.getElementById("modal-section-status");
  const name   = input ? input.value.trim() : "";

  if (!name) {
    status.className = "status-msg error"; status.style.display = "flex";
    status.textContent = "Section name cannot be empty."; return;
  }
  if (!window.sections) window.sections = [];
  if (window.sections.some(s => s.toLowerCase() === name.toLowerCase())) {
    status.className = "status-msg error"; status.style.display = "flex";
    status.textContent = `"${name}" already exists.`; return;
  }

  window.sections.push(name);
  saveToLocalBackup();
  document.getElementById("add-section-modal").style.display = "none";

  // Re-render the section cards and go to the new section
  renderSectionCards();
  syncDatabase();
}

// ------------------------------------------
// Add Student Modal
// ------------------------------------------
function showAddStudentModal() {
  const form = document.getElementById("add-student-form");
  if (form) form.reset();
  document.getElementById("add-student-modal").style.display = "flex";
}
function closeAddStudentModal(e) {
  if (e && e.target !== document.getElementById("add-student-modal")) return;
  document.getElementById("add-student-modal").style.display = "none";
  const form = document.getElementById("add-student-form");
  if (form) form.reset();
}
function handleAddStudent(e) {
  e.preventDefault();
  const first_name  = document.getElementById("new-first-name").value.trim();
  const id_number   = document.getElementById("new-id-number").value.trim();
  const initialObs  = document.getElementById("new-initial-observation").value.trim();
  const section     = window.selectedSection || (window.sections && window.sections[0]) || "Section A";

  if (localStudents.some(s => s.id_number.toLowerCase() === id_number.toLowerCase())) {
    alert("A student with this ID number already exists!"); return;
  }

  const newId = localStudents.length > 0 ? Math.max(...localStudents.map(s => s.id)) + 1 : 1;
  const newStudent = { id: newId, first_name, id_number, section, observations: [] };
  if (initialObs) newStudent.observations.push({ date: new Date().toLocaleString(), text: initialObs });

  localStudents.push(newStudent);
  window.students = [...localStudents];
  saveToLocalBackup();

  document.getElementById("add-student-modal").style.display = "none";
  const form = document.getElementById("add-student-form");
  if (form) form.reset();

  renderStudentList();
  selectStudent(newId);
  syncDatabase();
}

// ------------------------------------------
// Edit Student Modal
// ------------------------------------------
function openEditStudentModal() {
  const student = localStudents.find(s => s.id === selectedStudentId);
  if (!student) return;
  document.getElementById("modal-edit-name-input").value     = student.first_name;
  document.getElementById("modal-edit-password-input").value = student.id_number;
  document.getElementById("modal-edit-status").style.display = "none";
  document.getElementById("edit-student-modal").style.display = "flex";
}
function closeEditStudentModal(e) {
  if (e && e.target !== document.getElementById("edit-student-modal")) return;
  document.getElementById("edit-student-modal").style.display = "none";
}
function saveStudentDetails() {
  if (selectedStudentId === null) return;
  const nameInput = document.getElementById("modal-edit-name-input");
  const pwInput   = document.getElementById("modal-edit-password-input");
  const status    = document.getElementById("modal-edit-status");

  const newName = nameInput ? nameInput.value.trim() : "";
  const newPw   = pwInput   ? pwInput.value.trim()   : "";

  if (!newName) {
    status.className = "status-msg error"; status.style.display = "flex";
    status.textContent = "First name cannot be empty."; return;
  }
  if (!newPw) {
    status.className = "status-msg error"; status.style.display = "flex";
    status.textContent = "Password cannot be empty."; return;
  }
  const duplicate = localStudents.find(s => s.id !== selectedStudentId && s.id_number.toLowerCase() === newPw.toLowerCase());
  if (duplicate) {
    status.className = "status-msg error"; status.style.display = "flex";
    status.textContent = `"${newPw}" is already used by another student.`; return;
  }

  const student = localStudents.find(s => s.id === selectedStudentId);
  if (student) {
    student.first_name = newName;
    student.id_number  = newPw;

    document.getElementById("student-name").textContent = newName;
    document.getElementById("student-id").textContent   = newPw;

    window.students = [...localStudents];
    saveToLocalBackup();
    document.getElementById("edit-student-modal").style.display = "none";
    renderStudentList();
    syncDatabase();
  }
}
function deleteStudentProfile() {
  if (selectedStudentId === null) return;
  const student = localStudents.find(s => s.id === selectedStudentId);
  if (!student) return;
  if (!confirm(`Permanently delete "${student.first_name}" and all their observations? This cannot be undone.`)) return;

  localStudents = localStudents.filter(s => s.id !== selectedStudentId);
  window.students = [...localStudents];
  saveToLocalBackup();

  selectedStudentId = null;
  document.getElementById("edit-student-modal").style.display = "none";
  document.getElementById("student-detail-panel").style.display = "none";
  document.getElementById("no-selection-panel").style.display  = "block";

  renderStudentList();
  syncDatabase();
}

// ------------------------------------------
// GitHub Config
// ------------------------------------------
function checkGitHubConfig() {
  const warning = document.getElementById("config-warning");
  if (!warning) return;
  if (!getToken()) {
    warning.innerHTML = "Action required: Enter your GitHub PAT Token in the settings panel and click Update &amp; Sync Config.";
    warning.style.display = "flex";
  } else {
    warning.style.display = "none";
  }
}

async function updateGitHubSettings() {
  const owner   = document.getElementById("cfg-owner").value.trim();
  const repo    = document.getElementById("cfg-repo").value.trim();
  const rawToken = document.getElementById("cfg-token").value.trim();
  const statusEl = document.getElementById("cfg-status");

  if (!statusEl) return;
  statusEl.className = "status-msg info";
  statusEl.style.display = "flex";
  statusEl.textContent = "Saving settings...";

  if (!owner || !repo) {
    statusEl.className = "status-msg error";
    statusEl.textContent = "Error: Username and Repo Name are required."; return;
  }

  window.GITHUB_CONFIG.owner = owner;
  window.GITHUB_CONFIG.repo  = repo;

  if (rawToken) setToken(rawToken);

  if (!getToken()) {
    statusEl.className = "status-msg error";
    statusEl.textContent = "Error: GitHub PAT Token is required."; return;
  }

  try {
    await syncDatabase();
    statusEl.className = "status-msg success";
    statusEl.textContent = "Success: Settings saved! Token stored in browser only.";
    const tokenInput = document.getElementById("cfg-token");
    if (tokenInput) { tokenInput.value = ""; tokenInput.placeholder = "Configured (Enter new to overwrite)"; }
    checkGitHubConfig();
    setTimeout(() => { statusEl.style.display = "none"; }, 5000);
  } catch (err) {
    statusEl.className = "status-msg error";
    statusEl.textContent = `Error: ${err.message}`;
  }
}

// ------------------------------------------
// GitHub Sync
// ------------------------------------------
async function syncDatabase() {
  const statusEl = document.getElementById("save-status");
  if (statusEl) {
    statusEl.className = "status-msg info";
    statusEl.style.display = "flex";
    statusEl.innerHTML = `<span class="spinner"></span> Syncing with GitHub...`;
  }

  const config = window.GITHUB_CONFIG;
  const token  = getToken();

  if (!token) {
    const msg = "GitHub PAT Token is missing. Enter it in the settings panel.";
    if (statusEl) { statusEl.className = "status-msg error"; statusEl.style.display = "flex"; statusEl.textContent = `Error: ${msg}`; }
    throw new Error(msg);
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;

  const getResp = await fetch(`${url}?ref=${config.branch}&_=${Date.now()}`, {
    cache: "no-store",
    headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github.v3+json" }
  });

  let sha = null;
  if (getResp.ok) sha = (await getResp.json()).sha;
  else if (getResp.status !== 404) throw new Error(`Fetch failed: ${getResp.status}`);

  const fileContent   = buildDataJsContent();
  const utf8Bytes     = new TextEncoder().encode(fileContent);
  const base64Content = btoa(String.fromCharCode(...utf8Bytes));
  const putBody       = { message: "Update student database (Aetheris CMS)", content: base64Content, branch: config.branch };
  if (sha) putBody.sha = sha;

  const putResp = await fetch(url, {
    method: "PUT",
    headers: { "Authorization": `token ${token}`, "Content-Type": "application/json", "Accept": "application/vnd.github.v3+json" },
    body: JSON.stringify(putBody)
  });

  if (!putResp.ok) {
    const errBody = await putResp.json();
    // Auto-retry on SHA mismatch
    if (putResp.status === 409 || (errBody.message && errBody.message.includes("does not match"))) {
      const retryGet = await fetch(`${url}?ref=${config.branch}&_=${Date.now()}`, {
        cache: "no-store",
        headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github.v3+json" }
      });
      if (retryGet.ok) {
        putBody.sha = (await retryGet.json()).sha;
        const retryPut = await fetch(url, {
          method: "PUT",
          headers: { "Authorization": `token ${token}`, "Content-Type": "application/json", "Accept": "application/vnd.github.v3+json" },
          body: JSON.stringify(putBody)
        });
        if (!retryPut.ok) {
          const rErr = await retryPut.json();
          throw new Error(rErr.message || "Retry failed.");
        }
        if (statusEl) { statusEl.className = "status-msg success"; statusEl.style.display = "flex"; statusEl.textContent = "Saved and Synced to GitHub!"; }
        window.students = [...localStudents];
        return;
      }
    }
    throw new Error(errBody.message || "Failed to write to GitHub.");
  }

  if (statusEl) { statusEl.className = "status-msg success"; statusEl.style.display = "flex"; statusEl.textContent = "Saved and Synced to GitHub!"; }
  window.students = [...localStudents];
}

function logout() {
  sessionStorage.removeItem("teacher_auth");
  sessionStorage.removeItem("parent_auth");
  sessionStorage.removeItem("parent_child_id");
  window.location.reload();
}

// ==========================================
// PARENT PORTAL
// ==========================================

function initParentPortal() {
  const isAuth    = sessionStorage.getItem("parent_auth") === "true";
  const studentId = sessionStorage.getItem("parent_child_id");
  const loginEl   = document.getElementById("login-container");

  if (isAuth && studentId) {
    showParentDashboard(parseInt(studentId));
  } else if (loginEl) {
    loginEl.style.display = "block";
  }

  const form = document.getElementById("parent-login-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const statusEl = document.getElementById("login-error");
      if (statusEl) {
        statusEl.className = "status-msg info";
        statusEl.style.display = "flex";
        statusEl.innerHTML = `<span class="spinner"></span> Verifying credentials...`;
      }

      try {
        const latest = await fetchLatestStudents();
        if (latest) window.students = latest;
      } catch (_) {}

      const username = document.getElementById("parent-username").value.trim().toLowerCase();
      const password = document.getElementById("parent-password").value.trim();
      const student  = (window.students || []).find(s =>
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
  const loginEl = document.getElementById("login-container");
  const dbEl    = document.getElementById("dashboard-container");
  if (loginEl) loginEl.style.display = "none";
  if (dbEl)    dbEl.style.display    = "block";

  renderParentData(studentId);

  try {
    const latest = await fetchLatestStudents();
    if (latest) { window.students = latest; renderParentData(studentId); }
  } catch (_) {}
}

function renderParentData(studentId) {
  const student = (window.students || []).find(s => s.id === studentId);
  if (!student) { logout(); return; }

  const nameEl  = document.getElementById("child-name");
  const idEl    = document.getElementById("child-id");
  const notesEl = document.getElementById("notes-content");

  if (nameEl)  nameEl.textContent = student.first_name;
  if (idEl)    idEl.textContent   = student.id_number;

  if (notesEl) {
    notesEl.innerHTML = "";
    let observations = student.observations || [];
    if (observations.length === 0 && student.notes && student.notes.trim()) {
      observations = [{ date: "Previous Note", text: student.notes }];
    }

    if (observations.length === 0) {
      notesEl.innerHTML = `<div class="notes-display-box" style="display:flex;align-items:center;justify-content:center;"><em style="color:var(--text-muted);">No observations have been recorded for your child yet.</em></div>`;
    } else {
      const wrapper = document.createElement("div");
      wrapper.className = "observations-history";
      wrapper.style.maxHeight = "400px";
      observations.forEach(obs => {
        const card = document.createElement("div");
        card.className = "observation-card";
        card.innerHTML = `<div class="observation-date">${obs.date}</div><div class="observation-text">${obs.text}</div>`;
        wrapper.appendChild(card);
      });
      notesEl.appendChild(wrapper);
      wrapper.scrollTop = wrapper.scrollHeight;
    }
  }
}
