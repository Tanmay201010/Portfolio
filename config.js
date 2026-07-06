// =====================================================
// EDUPORTAL — CONFIGURATION
// ⚠️  SECURITY: Keep this repository PRIVATE.
//     GitHub auto-revokes PATs found in public repos.
// =====================================================

const GITHUB_CONFIG = {
  owner:    "YOUR_GITHUB_USERNAME",    // e.g. "johndoe"
  repo:     "YOUR_REPOSITORY_NAME",   // e.g. "classroom"
  branch:   "main",                   // "main" or "master"
  pat:      "ghp_YOUR_PAT_HERE",      // GitHub PAT with 'Contents: Read & Write'
  filePath: "data.js"                 // path to data file inside the repo
};

// Teacher login password
// Change this value and re-deploy to update the password.
const TEACHER_PASSWORD = "teacher123";
