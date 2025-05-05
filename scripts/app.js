import { initializeScoreTracker, updateScoreTracker, gradeScenario } from './grading.js';
import { startVoiceRecognition } from './mic.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let hardcodedResponses = {};
let gradingTemplate = {};
let scoreTracker = {};
let scenarioStarted = false;

// Load hardcoded responses from Firebase
firebase.database().ref('hardcodedResponses').once('value').then(snapshot => {
  hardcodedResponses = snapshot.val() || {};
  console.log("✅ Loaded hardcodedResponses");
});

// Load grading template dynamically
async function loadGradingTemplate(type = "medical") {
  const file = `grading_templates/${type}_assessment.json`;
  const res = await fetch(file);
  gradingTemplate = await res.json();
  initializeScoreTracker(gradingTemplate);
}

// GPT fallback
async function getAIResponseGPT4Turbo(message) {
  try {
    const res = await fetch('/api/gpt4-turbo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
    const data = await res.json();
    return data.reply || null;
  } catch (e) {
    logErrorToDatabase("GPT fallback failed: " + e.message);
    return null;
  }
}

// Vector fallback
async function getVectorResponse(message) {
  try {
    const res = await fetch('/api/vector-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message })
    });
    const data = await res.json();
    return data.match || null;
  } catch (e) {
    logErrorToDatabase("Vector search failed: " + e.message);
    return null;
  }
}

// Hardcoded match
function checkHardcodedResponse(message) {
  if (!hardcodedResponses) return null;
  const normalized = message.trim().toLowerCase();
  for (const key in hardcodedResponses) {
    const stored = hardcodedResponses[key];
    if (stored?.userQuestion?.trim().toLowerCase() === normalized) {
      return stored;
    }
  }
  return null;
}

// Determine if proctor should answer
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

// Main message handler
async function processUserMessage(message) {
  const role = isProctorQuestion(message) ? "proctor" : "patient";
  updateScoreTracker(message);

  let source = "unknown";
  let response = null;

  const hardcoded = checkHardcodedResponse(message);
  if (hardcoded?.aiResponse) {
    response = hardcoded.aiResponse;
    source = "hardcoded";
  }

  if (!response) {
    const vectorMatch = await getVectorResponse(message);
    if (vectorMatch) {
      response = vectorMatch;
      source = "vector";
    }
  }

  if (!response) {
    response = await getAIResponseGPT4Turbo(message);
    source = "gpt-4";
  }

  if (!response) {
    response = "I'm not sure how to respond to that.";
    source = "fallback";
  }

  displayChatResponse(response, message, role === "proctor" ? "🧑‍⚕️ Proctor" : "🧍 Patient", source);
}

// Display response with tag
function displayChatResponse(response, userMessage, responder, sourceTag = "") {
  const chatBox = document.getElementById("chatBox");

  const userDiv = document.createElement("div");
  userDiv.innerHTML = `<strong>🧑 You:</strong> ${userMessage}`;
  chatBox.appendChild(userDiv);

  const botDiv = document.createElement("div");
  botDiv.innerHTML = `<strong>${responder} (${sourceTag}):</strong> ${response}`;
  chatBox.appendChild(botDiv);

  chatBox.scrollTop = chatBox.scrollHeight;
}

// DOM interaction
document.getElementById("sendButton").addEventListener("click", () => {
  const input = document.getElementById("userInput");
  const msg = input.value.trim();
  if (msg) {
    processUserMessage(msg);
    input.value = "";
  }
});

document.getElementById("userInput").addEventListener("keypress", e => {
  if (e.key === "Enter") {
    const msg = e.target.value.trim();
    if (msg) {
      processUserMessage(msg);
      e.target.value = "";
    }
  }
});

document.getElementById("startButton").addEventListener("click", async () => {
  if (!scenarioStarted) {
    scenarioStarted = true;
    await loadGradingTemplate();
    displayChatResponse("You are dispatched to a call...", "📟 Dispatch", "📟 Dispatch", "system");
  }
});

document.getElementById("endButton").addEventListener("click", () => {
  const score = gradeScenario(scoreTracker);
  alert("Simulation Complete. Score: " + score.total + "/" + score.max);
});
// Start scenario (linked to Start Button)
window.startScenario = async function () {
  if (scenarioStarted) return;
  scenarioStarted = true;
  try {
    const configRes = await fetch(`${scenarioPath}config.json`);
    const config = await configRes.json();
    await loadGradingTemplate(config.grading || "medical");
    const dispatch = await loadDispatchInfo();
    patientContext = await loadPatientInfo();
    displayChatResponse(`🚑 Dispatch: ${dispatch}`);
  } catch (err) {
    logErrorToDatabase("startScenario error: " + err.message);
    displayChatResponse("❌ Failed to load scenario. Missing config or files.");
  }
};

// End scenario (linked to End Button)
window.endScenario = function () {
  const feedback = gradeScenario();
  displayChatResponse("📦 Scenario ended. Here's your performance summary:<br><br>" + feedback);
  scenarioStarted = false;
};

// Set up all button event listeners once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('send-button');
  const input = document.getElementById('user-input');
  const startBtn = document.getElementById('start-button');
  const endBtn = document.getElementById('end-button');
  const micBtn = document.getElementById('mic-button');

  sendBtn?.addEventListener('click', () => {
    const message = input.value.trim();
    if (message) {
      processUserMessage(message);
      input.value = '';
    }
  });

  input?.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendBtn.click();
    }
  });

  startBtn?.addEventListener('click', () => window.startScenario?.());
  endBtn?.addEventListener('click', () => window.endScenario?.());
  micBtn?.addEventListener('click', () => startVoiceRecognition?.());
});
