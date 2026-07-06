// Student Management System - Data Store
// This file is read and written dynamically using the GitHub API.

window.TEACHER_PASSWORD = "teacher123";

window.GITHUB_CONFIG = {
  token: "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",
  owner: "Tanmay201010", // Update this to your exact GitHub Username
  repo: "Portfolio",  // Update this to your exact GitHub repository name
  branch: "main",      // Update if your default branch is different (e.g. "master")
  path: "data.js"      // Do not change unless the file name changes
};

window.students = [
  {
    id: 1,
    first_name: "Alice",
    id_number: "STU-001",
    observations: [
      { date: "2026-07-06 14:30", text: "Alice is doing exceptionally well in class activities and shows great progress." }
    ]
  },
  {
    id: 2,
    first_name: "Bob",
    id_number: "STU-002",
    observations: [
      { date: "2026-07-06 15:10", text: "Bob is highly creative but needs to focus more during math classes." }
    ]
  },
  {
    id: 3,
    first_name: "Charlie",
    id_number: "STU-003",
    observations: [
      { date: "2026-07-06 15:45", text: "Charlie is quiet in class but submits all assignments on time and with high quality." }
    ]
  }
];
