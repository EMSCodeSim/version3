
import { initializeScoreTracker, updateScoreTracker, gradeScenario } from './grading.js';
import { startVoiceRecognition } from './mic.js';
import { routeUserInput, loadHardcodedResponses } from './router.js';
import { getHardcodedResponse } from './hardcodedSearch.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let gradingTemplate = {};
let scoreTracker = {};
let scenarioStarted = false;

// Load grading template
async function loadGradingTemplate(type = "medical") {
  const file = `grading_templates/${type}_assessment.json`;
  const res = await fetch(file);
  gradingTemplate = await res.json();
  initializeScoreTracker(gradingTemplate);
}

// Proctor question filter
function isProctorQuestion(message) {
  const keywords = ["scene safe", "bsi", "oxygen", "pulse", "splint", "tourniquet", "iv", "administer"];
  return keywords.some(k => message.toLowerCase().includes(k));
}

// Process user message
async function processUserMessage(message) {
  if (!message) return;

  const lower = message.trim().toLowerCase();
  const hardcoded = await getHardcodedResponse(lower);

  if (hardcoded) {
    showMessage(hardcoded.response, hardcoded.role || "Patient");
    if (hardcoded.ttsAudio) playAudio(hardcoded.ttsAudio);
    if (hardcoded.triggerFile) showTrigger(hardcoded.triggerFile, hardcoded.triggerFileType);
    return;
  }

  try {
    const { response, source } = await routeUserInput(message);
    showMessage(response, source || "Patient");
  } catch (err) {
    console.error("Router error:", err);
    showMessage("There was an error processing your message.");
  }
}

// UI: Show message
function showMessage(message, sender = "Patient") {
  const chatBox = document.getElementById("chat-box");
  const msg = document.createElement("div");
  msg.innerHTML = `<strong>${sender}:</strong> ${message}`;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// UI: Play TTS audio
function playAudio(base64Audio) {
  const audio = new Audio(base64Audio);
  audio.play();
}

// UI: Show image/audio trigger
function showTrigger(fileBase64, type) {
  const box = document.getElementById("chat-box");
  const wrapper = document.createElement("div");

  if (type.startsWith("image")) {
    const img = document.createElement("img");
    img.src = fileBase64;
    img.style.maxWidth = "100%";
    wrapper.appendChild(img);
  } else if (type.startsWith("audio")) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = fileBase64;
    wrapper.appendChild(audio);
  }

  box.appendChild(wrapper);
  box.scrollTop = box.scrollHeight;
}

// SCENARIO LOGIC
function startScenario() {
  if (scenarioStarted) return;
  scenarioStarted = true;
  const dispatch = "Unit 12, respond for a 62-year-old male with chest pain at the park.";
  showMessage(dispatch, "Dispatch");
}

function endScenario() {
  showMessage("Scenario ended. Handoff complete.", "System");
  scenarioStarted = false;
}

// EVENT BINDINGS
document.getElementById("send-button").addEventListener("click", () => {
  const input = document.getElementById("user-input");
  const message = input.value.trim();
  if (message) {
    showMessage(message, "You");
    processUserMessage(message);
    input.value = "";
  }
});

document.getElementById("user-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("send-button").click();
  }
});

// GLOBAL ACCESS FOR HTML BUTTONS
window.startScenario = startScenario;
window.endScenario = endScenario;
