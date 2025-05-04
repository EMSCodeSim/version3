import { initializeScoreTracker, updateScoreTracker, gradeScenario } from './grading.js';
import { routeMessage } from './router.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let hardcodedResponses = {};
let gradingTemplate = {};
let scoreTracker = {};

// Load hardcoded responses
firebase.database().ref('hardcodedResponses').once('value').then(snapshot => {
  hardcodedResponses = snapshot.val() || {};
  console.log("✅ Loaded hardcodedResponses:", hardcodedResponses);
});

// Load grading template
async function loadGradingTemplate(type = "medical") {
  const file = `grading_templates/${type}_assessment.json`;
  const res = await fetch(file);
  gradingTemplate = await res.json();
  initializeScoreTracker(gradingTemplate);
}

// Speak via TTS or play audio
async function speak(text, speaker = "patient", audioUrl = null) {
  if (audioUrl) {
    const player = new Audio(audioUrl);
    player.play();
    return;
  }
  try {
    const res = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speaker })
    });
    const { audio } = await res.json();
    const audioBlob = new Blob([Uint8Array.from(atob(audio), c => c.charCodeAt(0))], {
      type: "audio/mpeg"
    });
    const url = URL.createObjectURL(audioBlob);
    const player = new Audio(url);
    player.play();
  } catch (err) {
    console.error("TTS Error:", err);
  }
}

// Display chat response
export async function displayChatResponse(response, question = "", role = "", audioUrl = null) {
  const chatBox = document.getElementById("chat-box");
  const roleClass = role.toLowerCase().includes("proctor") ? "proctor-bubble" : "patient-bubble";
  chatBox.innerHTML += `
    ${question ? `<div class="question"><b>You:</b> ${question}</div>` : ""}
    <div class="response ${roleClass}">${role ? `<b>${role}:</b> ` : ""}${response}</div>
  `;
  chatBox.scrollTop = chatBox.scrollHeight;
  const speaker = role.toLowerCase().includes("proctor") ? "proctor" : "patient";
  speak(response, speaker, audioUrl);
}

// Dispatch + patient loading
async function loadDispatchInfo() {
  try {
    const res = await fetch(`${scenarioPath}dispatch.txt`);
    return await res.text();
  } catch (e) {
    logErrorToDatabase("Dispatch load error: " + e.message);
    return "Dispatch not available.";
  }
}
async function loadPatientInfo() {
  try {
    const res = await fetch(`${scenarioPath}patient.txt`);
    return await res.text();
  } catch (e) {
    logErrorToDatabase("Patient load error: " + e.message);
    return "Patient info not available.";
  }
}

// Logging
function logErrorToDatabase(error) {
  firebase.database().ref('error_logs').push({ error, timestamp: Date.now() });
  console.error("🚨", error);
}

// Start Scenario
window.startScenario = async function () {
  console.log("▶️ Scenario starting...");
  try {
    const configRes = await fetch(`${scenarioPath}config.json`);
    const config = await configRes.json();
    const gradingType = config.grading || "medical";

    await loadGradingTemplate(gradingType);

    // Show scene image
    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML += `<div class="image"><img src="/media/scene1.png" width="100%" /></div>`;

    const dispatch = await loadDispatchInfo();
    patientContext = await loadPatientInfo();
    displayChatResponse(`🚑 Dispatch: ${dispatch}`);
  } catch (err) {
    logErrorToDatabase("startScenario error: " + err.message);
    displayChatResponse("❌ Failed to load scenario.");
  }
};

// End Scenario and grade
window.endScenario = async function () {
  const feedback = await gradeScenario(); // properly await
  displayChatResponse("📦 Scenario ended. Here's your performance summary:<br><br>" + feedback);
};

// User input logic
async function processUserMessage(message) {
  updateScoreTracker(message); // Track for grading
  await routeMessage(message); // Route via router.js
}

// DOM Bindings
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById("send-button");
  const input = document.getElementById("user-input");
  const startBtn = document.getElementById("start-button");
  const endBtn = document.getElementById("end-button");
  const micBtn = document.getElementById("mic-button");

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

  startBtn?.addEventListener('click', () => window.startScenario());
  endBtn?.addEventListener('click', () => window.endScenario());
  micBtn?.addEventListener('click', () => window.startVoiceRecognition?.());
});
