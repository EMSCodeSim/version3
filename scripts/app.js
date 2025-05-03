import { initializeScoreTracker, updateScoreTracker, gradeScenario } from './grading.js';
import { routeMessage } from './router.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let scenarioStarted = false;

async function speak(text, speaker = "patient", audioUrl = null) {
  try {
    if (audioUrl) {
      new Audio(audioUrl).play();
      return;
    }
    const res = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speaker })
    });
    const { audio } = await res.json();
    const blob = new Blob([Uint8Array.from(atob(audio), c => c.charCodeAt(0))], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    new Audio(url).play();
  } catch (err) {
    console.error("TTS error:", err);
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

  if (role && !response.includes('<ul')) {
    const speaker = role.toLowerCase().includes("proctor") ? "proctor" : "patient";
    speak(response, speaker, audioUrl);
  }
}

async function processUserMessage(message) {
  updateScoreTracker(message);
  await routeMessage(message, displayChatResponse);
}

async function loadDispatchInfo() {
  const res = await fetch(`${scenarioPath}dispatch.txt`);
  return await res.text();
}

async function loadPatientInfo() {
  const res = await fetch(`${scenarioPath}patient.txt`);
  return await res.text();
}

function logErrorToDatabase(errorInfo) {
  console.error("🔴 Error:", errorInfo);
  firebase.database().ref('error_logs').push({
    error: errorInfo,
    timestamp: Date.now()
  });
}

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
    displayChatResponse("❌ Failed to load scenario.");
    logErrorToDatabase("startScenario error: " + err.message);
  }
};

window.endScenario = async function () {
  const result = await gradeScenario();
  displayChatResponse(result.feedbackText, "", "proctor");
};

document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('send-button');
  const input = document.getElementById('user-input');
  const startBtn = document.getElementById('start-button');
  const endBtn = document.getElementById('end-button');
  const micBtn = document.getElementById('mic-button');

  sendBtn?.addEventListener('click', () => {
    const msg = input.value.trim();
    if (msg) {
      processUserMessage(msg);
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
