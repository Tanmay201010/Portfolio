// Student Management System - Data Store
// This file is read and written dynamically using the GitHub API.

window.TEACHER_PASSWORD = "teacher123";

window.GITHUB_CONFIG = {
  // Saved in browser local storage only for security
  token_part1: "",
  token_part2: "",
  owner: "Tanmay201010",
  repo: "Portfolio",
  branch: "main",
  path: "data.js"
};


window.sections = ["Section A", "Section B"];

window.students = [
  {
    id: 1,
    first_name: "Alice",
    id_number: "STU-001",
    section: "Section A",
    observations: [
      { date: "2026-07-06 14:30", text: "Alice is doing exceptionally well in class activities and shows great progress." }
    ]
  },
  {
    id: 2,
    first_name: "Bob",
    id_number: "STU-002",
    section: "Section A",
    observations: [
      { date: "2026-07-06 15:10", text: "Bob is highly creative but needs to focus more during math classes." }
    ]
  },
  {
    id: 3,
    first_name: "Charlie",
    id_number: "STU-003",
    section: "Section B",
    observations: [
      { date: "2026-07-06 15:45", text: "Charlie is quiet in class but submits all assignments on time and with high quality." }
    ]
  }
];
