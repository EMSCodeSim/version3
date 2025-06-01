// app.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { initializeScoreTracker, gradeActionBySkillID, gradeScenario } from "./grading.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAmpYL8Ywfxkw_h2aMvF2prjiI0m5LYM40",
  authDomain: "ems-code-sim.firebaseapp.com",
  databaseURL: "https://ems-code-sim-default-rtdb.firebaseio.com",
  projectId: "ems-code-sim",
  storageBucket: "ems-code-sim.appspot.com",
  messagingSenderId: "190498607578",
  appId: "1:190498607578:web:4cf6c8e999b027956070e3",
  measurementId: "G-2Q3ZT01YT1"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let gradingTemplate = {};
let hardcodedResponses = {};
let scenarioStarted = false;
let chatLog = [];

// 1. Load grading template (medical_assessment.json)
async function loadGradingTemplate() {
  const response = await fetch("medical_assessment.json");
  gradingTemplate = await response.json();
  initializeScoreTracker(gradingTemplate);
}

// 2. Load hardcoded responses from Firebase
async function loadHardcodedResponses() {
  const snap = await get(ref(db, "hardcodedResponses"));
  hardcodedResponses = {};
  if (snap.exists()) {
    snap.forEach(child => {
      hardcodedResponses[child.key] = child.val();
    });
  }
}

// 3. Matching logic: exact match, then fallback (tags, GPT, etc. can be added)
function findBestHardcodedMatch(userInput) {
  const input = userInput.trim().toLowerCase();
  // 1. Exact match by question
  for (const key in hardcodedResponses) {
    if (
      hardcodedResponses[key].question &&
      hardcodedResponses[key].question.trim().toLowerCase() === input
    ) {
      return hardcodedResponses[key];
    }
  }
  // 2. Tag-based/fuzzy match logic could go here (if needed)
  return null;
}

// 4. UI Helpers
function displayMessage(role, text) {
  const chat = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.className = "message " + role;
  div.innerHTML = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function displayGradingSummary(html) {
  displayMessage("system", html);
}

// 5. Scenario Flow
async function startScenario() {
  scenarioStarted = true;
  chatLog = [];
  document.getElementById("chat-box").innerHTML = "";
  displayMessage("system", "<b>Scenario started. Please begin your assessment.</b>");
}

async function processUserInput(userInput) {
  if (!scenarioStarted) return;
  if (!userInput) return;

  displayMessage("user", userInput);
  chatLog.push({ role: "user", text: userInput });

  // 1. Try hardcoded/exact match
  const match = findBestHardcodedMatch(userInput);

  if (match) {
    displayMessage("ai", match.response);
    chatLog.push({ role: "ai", text: match.response });
    // -- SKILL SHEET GRADING: update on this action --
    if (match.skillSheetID) gradeActionBySkillID(match.skillSheetID);
  } else {
    // 2. Fallback: display generic or GPT-driven response
    displayMessage("ai", "<em>No hardcoded response found. (This would be handled by GPT in production.)</em>");
    chatLog.push({ role: "ai", text: "No hardcoded response found." });
    // Optionally: GPT fallback and then grade with returned skillSheetID if GPT is used
  }
}

// End and show grading
async function endScenario() {
  scenarioStarted = false;
  const gradingHtml = await gradeScenario();
  displayGradingSummary(gradingHtml);
}

// Reset scenario for repeat use
function resetScenario() {
  scenarioStarted = false;
  chatLog = [];
  document.getElementById("chat-box").innerHTML = "";
  initializeScoreTracker(gradingTemplate); // reset score
}

// 6. Event Listeners
document.addEventListener("DOMContentLoaded", async () => {
  await loadGradingTemplate();
  await loadHardcodedResponses();

  document.getElementById("start-btn").addEventListener("click", () => {
    startScenario();
  });

  document.getElementById("input-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!scenarioStarted) return;
    const userInput = document.getElementById("user-input").value.trim();
    if (!userInput) return;
    document.getElementById("user-input").value = "";
    await processUserInput(userInput);
  });

  document.getElementById("end-btn").addEventListener("click", async () => {
    await endScenario();
  });

  // Optional: add a reset button if you want to allow scenario restart
  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetScenario();
    });
  }
});
