import { initializeScoreTracker, updateScoreTracker, gradeScenario } from './grading.js';
import { startVoiceRecognition } from './mic.js';
import { routeUserInput, loadHardcodedResponses } from './router.js';
import { getHardcodedResponse } from './hardcodedSearch.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let gradingTemplate = {};
let scoreTracker = {};
let scenarioStarted = false;

// Load grading template (default to medical)
async function loadGradingTemplate(type = "medical") {
  const file = `grading_templates/${type}_assessment.json`;
  const res = await fetch(file);
  gradingTemplate = await res.json();
  initializeScoreTracker(gradingTemplate);
}

function isProctorQuestion(message) {
  const normalized = message.toLowerCase();
  const proctorPhrases = [
    "scene safe", "bsi", "mechanism of injury", "nature of illness", "number of patients",
    "additional resources", "c-spine", "blood pressure", "pulse", "respiratory rate", "oxygen",
    "pulse ox", "blood glucose", "temperature", "avpu", "i’m giving oxygen", "starting cpr",
    "applying splint", "applying dressing", "applying tourniquet", "administering",
    "making a transport decision", "how long", "time elapsed"
  ];
  return proctorPhrases.some(phrase => normalized.includes(phrase));
}

async function processUserMessage(message) {
  if (!message) return;

  const lowerMessage = message.trim().toLowerCase();

  // Check hardcoded responses
  const hardcoded = await getHardcodedResponse(lowerMessage);
  if (hardcoded) {
    showMessage(hardcoded.response);
    if (hardcoded.ttsAudio) playAudio(hardcoded.ttsAudio);
    if (hardcoded.triggerFile) showTrigger(hardcoded.triggerFile, hardcoded.triggerFileType);
    return;
  }

  // Default: route to GPT
  try {
    const { response, source } = await routeUserInput(message);
    showMessage(response, source);
  } catch (err) {
    console.error("Error routing user input:", err);
    showMessage("There was an error processing your input.");
  }
}

// DOM handlers
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

// Show message in chat
function showMessage(message, sender = "Patient") {
  const chatBox = document.getElementById("chat-box");
  const messageElement = document.createElement("div");
  messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Play audio from base64 TTS string
function playAudio(base64Audio) {
  const audio = new Audio(base64Audio);
  audio.play();
}

// Show trigger (image or audio)
function showTrigger(fileBase64, fileType) {
  const chatBox = document.getElementById("chat-box");
  const wrapper = document.createElement("div");

  if (fileType.startsWith("image")) {
    const img = document.createElement("img");
    img.src = fileBase64;
    img.style.maxWidth = "100%";
    wrapper.appendChild(img);
  } else if (fileType.startsWith("audio")) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = fileBase64;
    wrapper.appendChild(audio);
  }

  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Start Scenario logic
function startScenario() {
  if (scenarioStarted) return;

  scenarioStarted = true;
  const dispatchText = "Unit 12, respond for a 62-year-old male with chest pain at the park.";
  showMessage(dispatchText, "Dispatch");

  console.log("Scenario started.");
}

// End scenario logic (optional)
function endScenario() {
  showMessage("Scenario ended. Hand-off complete.", "System");
  scenarioStarted = false;
}
