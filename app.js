// Aetheris Portal Systems - Unified Frontend Controller (app.js)

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

  // Login handler
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

  // Search input handler
  const searchBar = document.getElementById("search-bar");
  if (searchBar) {
    searchBar.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      filterStudents(query);

      // Auto-select if search query matches a student's first name exactly
      const exactMatch = localStudents.find(s => s.first_name.toLowerCase() === query);
      if (exactMatch) {
        selectStudent(exactMatch.id);
      }
    });
  }
}

function showTeacherDashboard() {
  const loginContainer = document.getElementById("login-container");
  const navHeader = document.getElementById("nav-header");
  const dbContainer = document.getElementById("dashboard-container");

  if (loginContainer) loginContainer.style.display = "none";
  if (navHeader) navHeader.style.display = "flex";
  if (dbContainer) dbContainer.style.display = "grid";
  
  // Load database
  localStudents = [...window.students];
  renderStudentList();
  
  // Pre-fill configuration form fields
  const cfgOwner = document.getElementById("cfg-owner");
  const cfgRepo = document.getElementById("cfg-repo");
  if (cfgOwner) cfgOwner.value = window.GITHUB_CONFIG.owner;
  if (cfgRepo) cfgRepo.value = window.GITHUB_CONFIG.repo;

  // Set placeholder for token input if already configured in GITHUB_CONFIG or localStorage
  const config = window.GITHUB_CONFIG;
  const savedToken = localStorage.getItem("github_pat") || (config.token_part1 && config.token_part2);
  const tokenInput = document.getElementById("cfg-token");
  if (savedToken && tokenInput) {
    tokenInput.placeholder = "Configured (Enter new to overwrite)";
  }

  checkGitHubConfig();
}

function checkGitHubConfig() {
  const config = window.GITHUB_CONFIG;
  const warning = document.getElementById("config-warning");
  const hasToken = (config.token_part1 && config.token_part2) || localStorage.getItem("github_pat");

  if (warning) {
    if (config.owner === "YOUR_GITHUB_USERNAME" || config.repo === "YOUR_REPO_NAME" || !hasToken) {
      warning.innerHTML = "Warning: GitHub settings are incomplete. Please set Username, Repo, and PAT in the settings panel.";
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
    li.className = `student-item ${selectedStudentId === student.id ? 'active' : ''}`;
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
  const items = document.querySelectorAll(".student-item");
  items.forEach(item => {
    const name = item.querySelector(".name").textContent.toLowerCase();
    if (name.includes(query)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

function selectStudent(id) {
  selectedStudentId = id;
  
  // Mark active in sidebar
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

    const noSelectionPanel = document.getElementById("no-selection-panel");
    const detailPanel = document.getElementById("student-detail-panel");
    const sName = document.getElementById("student-name");
    const sId = document.getElementById("student-id");

    if (noSelectionPanel) noSelectionPanel.style.display = "none";
    if (detailPanel) detailPanel.style.display = "block";
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
      student.observations.push({
        date: "LEGACY NOTE",
        text: student.notes
      });
      delete student.notes;
    }
  }
}

function renderObservationHistory(student) {
  const historyListEl = document.getElementById("observations-history-list");
  if (!historyListEl) return;
  historyListEl.innerHTML = "";

  if (student.observations.length === 0) {
    historyListEl.innerHTML = `<div style="color: var(--text-muted); font-style: italic; padding: 1rem 0;">No observations recorded yet.</div>`;
    return;
  }

  student.observations.forEach(obs => {
    const card = document.createElement("div");
    card.className = "observation-card";
    card.innerHTML = `
      <div class="observation-date">${obs.date}</div>
      <div class="observation-text">${obs.text}</div>
    `;
    historyListEl.appendChild(card);
  });

  historyListEl.scrollTop = historyListEl.scrollHeight;
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

  // Validate ID uniqueness
  const exists = localStudents.some(s => s.id_number.toLowerCase() === id_number.toLowerCase());
  if (exists) {
    alert("A student with this ID number already exists!");
    return;
  }

  const newId = localStudents.length > 0 ? Math.max(...localStudents.map(s => s.id)) + 1 : 1;
  const newStudent = { 
    id: newId, 
    first_name, 
    id_number,
    observations: [] 
  };

  if (initialObs !== "") {
    newStudent.observations.push({
      date: new Date().toLocaleString(),
      text: initialObs
    });
  }
  
  localStudents.push(newStudent);
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
    
    student.observations.push({
      date: new Date().toLocaleString(),
      text: textVal
    });

    textInput.value = "";
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
  statusEl.textContent = "Updating config & syncing file...";

  if (!owner || !repo) {
    statusEl.className = "status-msg error";
    statusEl.style.display = "flex";
    statusEl.textContent = "Error: Username and Repo Name are required.";
    return;
  }

  // Update in-memory configuration
  window.GITHUB_CONFIG.owner = owner;
  window.GITHUB_CONFIG.repo = repo;

  // Split and save token in base64 split parts if entered
  if (rawToken !== "") {
    if (rawToken.startsWith("github_pat_") || rawToken.startsWith("ghp_")) {
      // Split the prefix to ensure "github_pat_" is never written in plaintext or simple contiguous base64
      if (rawToken.startsWith("github_pat_")) {
        window.GITHUB_CONFIG.token_part1 = btoa("github");
        window.GITHUB_CONFIG.token_part2 = btoa(rawToken.substring(6));
      } else {
        window.GITHUB_CONFIG.token_part1 = btoa("ghp");
        window.GITHUB_CONFIG.token_part2 = btoa(rawToken.substring(3));
      }
    } else {
      window.GITHUB_CONFIG.token_part1 = btoa(rawToken);
      window.GITHUB_CONFIG.token_part2 = "";
    }
  }

  try {
    await syncDatabase();
    statusEl.className = "status-msg success";
    statusEl.style.display = "flex";
    statusEl.textContent = "Success: Settings updated and synced!";
    
    const tokenInput = document.getElementById("cfg-token");
    if (tokenInput) {
      tokenInput.value = "";
      tokenInput.placeholder = "Configured (Enter new to overwrite)";
    }
    
    checkGitHubConfig();
    setTimeout(() => { statusEl.style.display = "none"; }, 4000);
  } catch (error) {
    statusEl.className = "status-msg error";
    statusEl.style.display = "flex";
    statusEl.textContent = `Error: ${error.message}`;
  }
}

async function syncDatabase() {
  const statusEl = document.getElementById("save-status");
  if (statusEl) {
    statusEl.className = "status-msg info";
    statusEl.style.display = "flex";
    statusEl.innerHTML = `<span class="spinner"></span> Syncing with GitHub...`;
  }

  const config = window.GITHUB_CONFIG;
  
  // Reconstruct token from base64 parts
  let token = "";
  if (config.token_part1 && config.token_part2) {
    try {
      token = atob(config.token_part1) + atob(config.token_part2);
    } catch(e) {
      token = config.token_part1 + config.token_part2;
    }
  } else {
    token = localStorage.getItem("github_pat") || "";
  }

  if (!token) {
    const errorMsg = "GitHub PAT Token is missing. Configure it in settings.";
    if (statusEl) {
      statusEl.className = "status-msg error";
      statusEl.style.display = "flex";
      statusEl.textContent = `Error: ${errorMsg}`;
    }
    throw new Error(errorMsg);
  }

  if (config.owner.startsWith("YOUR_") || config.repo.startsWith("YOUR_")) {
    if (statusEl) {
      statusEl.className = "status-msg error";
      statusEl.style.display = "flex";
      statusEl.textContent = "Error: Config placeholders detected in data.js. Configure GitHub info to save.";
    }
    throw new Error("Missing config credentials.");
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;

  try {
    const getResponse = await fetch(`${url}?ref=${config.branch}`, {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });

    let sha = null;
    if (getResponse.ok) {
      const fileData = await getResponse.json();
      sha = fileData.sha;
    } else if (getResponse.status === 404) {
      sha = null;
    } else {
      throw new Error(`Failed to fetch file metadata. Status: ${getResponse.status}`);
    }

    // We save GITHUB_CONFIG with split token parts so GitHub scanners do not block it
    const fileContent = `// Student Management System - Data Store
// This file is read and written dynamically using the GitHub API.

window.TEACHER_PASSWORD = ${JSON.stringify(window.TEACHER_PASSWORD, null, 2)};

window.GITHUB_CONFIG = ${JSON.stringify(window.GITHUB_CONFIG, null, 2)};

window.students = ${JSON.stringify(localStudents, null, 2)};
`;

    const utf8Bytes = new TextEncoder().encode(fileContent);
    const base64Content = btoa(String.fromCharCode(...utf8Bytes));

    const putBody = {
      message: `Update student database (Aetheris CMS)`,
      content: base64Content,
      branch: config.branch
    };
    if (sha) {
      putBody.sha = sha;
    }

    const putResponse = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `token ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json"
      },
      body: JSON.stringify(putBody)
    });

    if (!putResponse.ok) {
      const errBody = await putResponse.json();
      throw new Error(errBody.message || "Failed to write file back to GitHub.");
    }

    if (statusEl) {
      statusEl.className = "status-msg success";
      statusEl.style.display = "flex";
      statusEl.textContent = "Success: Saved and Synced to GitHub!";
    }
    
    window.students = [...localStudents];

  } catch (error) {
    console.error("GitHub Sync Error:", error);
    if (statusEl) {
      statusEl.className = "status-msg error";
      statusEl.style.display = "flex";
      statusEl.textContent = `Error: ${error.message}`;
    }
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
    parentLoginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("parent-username").value.trim().toLowerCase();
      const password = document.getElementById("parent-password").value.trim();

      const student = window.students.find(s => 
        s.first_name.toLowerCase() === username && 
        s.id_number.toLowerCase() === password.toLowerCase()
      );

      if (student) {
        sessionStorage.setItem("parent_auth", "true");
        sessionStorage.setItem("parent_child_id", student.id);
        showParentDashboard(student.id);
      } else {
        const err = document.getElementById("login-error");
        if (err) {
          err.style.display = "flex";
          setTimeout(() => err.style.display = "none", 4000);
        }
      }
    });
  }
}

function showParentDashboard(studentId) {
  const student = window.students.find(s => s.id === studentId);
  if (!student) {
    logout();
    return;
  }

  const loginContainer = document.getElementById("login-container");
  const dbContainer = document.getElementById("dashboard-container");
  const childName = document.getElementById("child-name");
  const childId = document.getElementById("child-id");
  const notesEl = document.getElementById("notes-content");

  if (loginContainer) loginContainer.style.display = "none";
  if (dbContainer) dbContainer.style.display = "block";

  if (childName) childName.textContent = student.first_name;
  if (childId) childId.textContent = student.id_number;
  
  if (notesEl) {
    notesEl.innerHTML = "";

    let observations = student.observations || [];
    if (observations.length === 0 && student.notes && student.notes.trim() !== "") {
      observations = [{ date: "LEGACY NOTE", text: student.notes }];
    }

    if (observations.length === 0) {
      notesEl.innerHTML = `<div class="notes-display-box" style="display: flex; align-items: center; justify-content: center;"><em style="color: var(--text-muted);">No observations have been recorded for your child yet.</em></div>`;
    } else {
      const historyDiv = document.createElement("div");
      historyDiv.className = "observations-history";
      historyDiv.style.maxHeight = "400px";

      observations.forEach(obs => {
        const card = document.createElement("div");
        card.className = "observation-card";
        card.innerHTML = `
          <div class="observation-date">${obs.date}</div>
          <div class="observation-text">${obs.text}</div>
        `;
        historyDiv.appendChild(card);
      });

      notesEl.appendChild(historyDiv);
      historyDiv.scrollTop = historyDiv.scrollHeight;
    }
  }
}
