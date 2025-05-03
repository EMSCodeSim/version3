import { initializeScoreTracker, updateScoreTracker, gradeScenario } from './grading.js';
import { routeMessage } from './router.js';
import { getVectorResponse } from './vector.js';
import { getAIResponseGPT4Turbo } from './gpt.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let scenarioStarted = false;

// Load hardcoded responses once at startup (optional, handled in hardcoded.js if needed)
firebase.database().ref('hardcodedResponses').once('value').then(snapshot => {
  console.log("✅ Firebase connection confirmed");
});

// Speak via TTS or play audio
async function speak(text, speaker = "patient", audioUrl = null) {
  try {
    if (audioUrl) {
      const player = new Audio(audioUrl);
      player.play();
      return;
    }

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
    console.error("TTS playback error:", err);
  }
}

// Display response in chat UI
async function displayChatResponse(response, question = "", role = "", audioUrl = null) {
  const chatBox = document.getElementById("chat-box");
  const roleClass = role.toLowerCase().includes("proctor") ? "proctor-bubble" : "patient-bubble";
  chatBox.innerHTML += `
    ${question ? `<div class="question">🗣️ <b>You:</b> ${question}</div>` : ""}
    <div class="response ${roleClass}">${role ? `<b>${role}:</b> ` : ""}${response}</div>
  `;
  chatBox.scrollTop = chatBox.scrollHeight;

  // Only speak if role is patient or proctor
  if (role && !response.includes('<ul')) {
    const speaker = role.toLowerCase().includes("proctor") ? "proctor" : "patient";
    speak(response, speaker, audioUrl);
  }
}

// New unified input router (Proctor first logic)
async function processUserMessage(message) {
  updateScoreTracker(message); // Update grading
  await routeMessage(message, getVectorResponse, getAIResponseGPT4Turbo, displayChatResponse);
}

// Load patient dispatch info
async function loadDispatchInfo() {
  try {
    const res = await fetch(`${scenarioPath}dispatch.txt`);
    return await res.text();
  } catch (e) {
    logErrorToDatabase("Failed to load dispatch.txt: " + e.message);
    return "Dispatch not available.";
  }
}

async function loadPatientInfo() {
  try {
    const res = await fetch(`${scenarioPath}patient.txt`);
    return await res.text();
  } catch (e) {
    logErrorToDatabase("Failed to load patient.txt: " + e.message);
    return "Patient info not available.";
  }
}

// Log errors to Firebase
function logErrorToDatabase(errorInfo) {
  console.error("🔴 Error:", errorInfo);
  firebase.database().ref('error_logs').push({
    error: errorInfo,
    timestamp: Date.now()
  });
}

// Start Scenario
window.startScenario = async function () {
  if (scenarioStarted) return;
  scenarioStarted = true;

  try {
    const configRes = await fetch(`${scenarioPath}config.json`);
    const config = await configRes.json();
    await initializeScoreTracker(config.grading || "medical");

    const dispatch = await loadDispatchInfo();
    patientContext = await loadPatientInfo();

    displayChatResponse(`<img src="/media/scene1.png" style="max-width:100%;border-radius:10px;">`);
    displayChatResponse("🚑 Dispatch: " + dispatch);
  } catch (err) {
    displayChatResponse("❌ Scenario failed to load. Check config or file structure.");
    logErrorToDatabase("startScenario error: " + err.message);
  }
};

// End Scenario
window.endScenario = async function () {
  const result = await gradeScenario();
  displayChatResponse(result.feedbackText, "", "proctor");
};

// Button Handlers
document.addEventListener('DOMContentLoaded', function () {
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
  micBtn?.addEventListener('click', () => window.startVoiceRecognition?.());
});
