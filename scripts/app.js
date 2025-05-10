import { initializeScoreTracker, updateScoreTracker, gradeScenario } from './grading.js';
import { startVoiceRecognition } from './mic.js';
import { routeUserInput, loadHardcodedResponses } from './router.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let gradingTemplate = {};
let scoreTracker = {};
let scenarioStarted = false;

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

// ✅ Match Firebase entry by userQuestion string
async function getTTSAudioFromFirebase(question) {
  console.log("Looking for TTS match for:", question);
  const snapshot = await firebase.database().ref(`hardcodedResponses`).once('value');
  let result = null;

  snapshot.forEach(child => {
    const entry = child.val();
    if (
      entry.userQuestion &&
      entry.userQuestion.trim().toLowerCase() === question.trim().toLowerCase()
    ) {
      console.log("TTS match found:", entry.ttsAudio ? "✔️" : "❌ no audio");
      result = entry.ttsAudio;
    }
  });

  if (!result) console.warn("No TTS audio match found.");
  return result;
}

async function processUserMessage(message) {
  if (!message) return;
  const role = isProctorQuestion(message) ? "Proctor" : "Patient";

  try {
    const { response, source } = await routeUserInput(message, {
      scenarioId: scenarioPath,
      role: role.toLowerCase(),
    });

    let ttsAudio = null;
    if (source === "hardcoded") {
      ttsAudio = await getTTSAudioFromFirebase(message);
    }

    displayChatResponse(response, message, `${role} (${source})`, ttsAudio);
  } catch (err) {
    logErrorToDatabase("processUserMessage error: " + err.message);
    displayChatResponse("❌ AI response failed. Try again.");
  }
}

async function displayChatResponse(response, question = "", role = "", audioUrl = null) {
  const chatBox = document.getElementById("chat-box");
  const roleClass = role.toLowerCase().includes("proctor") ? "proctor-bubble" : "patient-bubble";
  chatBox.innerHTML += `
    ${question ? `<div class="question">🗣️ <b>You:</b> ${question}</div>` : ""}
    <div class="response ${roleClass}">${role ? `<b>${role}:</b> ` : ""}${response}</div>
  `;
  chatBox.scrollTop = chatBox.scrollHeight;

  if (audioUrl) {
    const preview = audioUrl.slice(0, 30);
    console.log("Attempting to play TTS audio:", preview);
    let src = audioUrl.startsWith("//") ? "https:" + audioUrl : audioUrl;
    const audio = audioUrl.startsWith("http") || audioUrl.startsWith("//")
      ? new Audio(src)
      : new Audio(`data:audio/mp3;base64,${audioUrl}`);
    audio.play().catch(err => {
      console.error("TTS playback error:", err.message);
    });
  } else {
    console.warn("No audio URL passed. Using speech synthesis.");
    speak(response, role.toLowerCase().includes("proctor") ? "proctor" : "patient");
  }
}

async function loadDispatchInfo() {
  try {
    const res = await fetch(`${scenarioPath}dispatch.txt`);
    return await res.text();
  } catch (e) {
    logErrorToDatabase("Dispatch load failed: " + e.message);
    return "Dispatch not available.";
  }
}

async function loadPatientInfo() {
  try {
    const res = await fetch(`${scenarioPath}patient.txt`);
    return await res.text();
  } catch (e) {
    logErrorToDatabase("Patient info load failed: " + e.message);
    return "Patient info not available.";
  }
}

function logErrorToDatabase(errorInfo) {
  console.error("🔴", errorInfo);
  firebase.database().ref('error_logs').push({ error: errorInfo, timestamp: Date.now() });
}

window.startScenario = async function () {
  if (scenarioStarted) return;

  try {
    await loadHardcodedResponses();

    const configRes = await fetch(`${scenarioPath}config.json`);
    const config = await configRes.json();
    await loadGradingTemplate(config.grading || "medical");

    const dispatch = await loadDispatchInfo();
    patientContext = await loadPatientInfo();

    displayChatResponse(`🚑 Dispatch: ${dispatch}`);
    scenarioStarted = true;
  } catch (err) {
    logErrorToDatabase("startScenario error: " + err.message);
    displayChatResponse("❌ Failed to load scenario. Missing config or files.");
  }
};

window.endScenario = function () {
  const feedback = gradeScenario();
  displayChatResponse("📦 Scenario ended. Here's your performance summary:<br><br>" + feedback);
  scenarioStarted = false;
};

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
