import { initializeScoreTracker, updateScoreTracker, gradeScenario } from './grading.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let scenarioStarted = false;

// Load hardcoded responses
let hardcodedResponses = {};
firebase.database().ref('hardcodedResponses').once('value').then(snapshot => {
  hardcodedResponses = snapshot.val() || {};
  console.log("✅ Loaded hardcodedResponses");
});

async function speak(text, speaker = "patient") {
  const res = await fetch("/.netlify/functions/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speaker })
  });
  const { audio } = await res.json();
  const blob = new Blob([Uint8Array.from(atob(audio), c => c.charCodeAt(0))], { type: "audio/mpeg" });
  new Audio(URL.createObjectURL(blob)).play();
}

function displayChatResponse(response, question = "", role = "") {
  const chatBox = document.getElementById("chat-box");
  const roleClass = role.toLowerCase().includes("proctor") ? "proctor-bubble" : "patient-bubble";
  chatBox.innerHTML += `
    ${question ? `<div class="question">🗣️ <b>You:</b> ${question}</div>` : ""}
    <div class="response ${roleClass}">${role ? `<b>${role}:</b> ` : ""}${response}</div>
  `;
  chatBox.scrollTop = chatBox.scrollHeight;
  speak(response, role.toLowerCase().includes("proctor") ? "proctor" : "patient");
}

function checkHardcodedResponse(message) {
  const normalized = message.trim().toLowerCase();
  for (const key in hardcodedResponses) {
    const stored = hardcodedResponses[key];
    if (stored?.userQuestion?.trim().toLowerCase() === normalized) {
      return stored;
    }
  }
  return null;
}

async function processUserMessage(message) {
  const role = message.toLowerCase().includes("bsi") || message.toLowerCase().includes("scene safe") ? "proctor" : "patient";

  updateScoreTracker(message);
  const hardcoded = checkHardcodedResponse(message);
  if (hardcoded?.aiResponse) {
    return displayChatResponse(hardcoded.aiResponse, message, role);
  }

  // Fallback AI
  const res = await fetch('/api/gpt4-turbo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message })
  });
  const data = await res.json();
  displayChatResponse(data.reply, message, role);
}

async function loadDispatchInfo() {
  const res = await fetch(`${scenarioPath}dispatch.txt`);
  return await res.text();
}

async function loadPatientInfo() {
  const res = await fetch(`${scenarioPath}patient.txt`);
  return await res.text();
}

window.startScenario = async function () {
  if (scenarioStarted) return;
  scenarioStarted = true;

  const configRes = await fetch(`${scenarioPath}config.json`);
  const config = await configRes.json();
  await initializeScoreTracker(config.grading || "medical");

  const dispatch = await loadDispatchInfo();
  patientContext = await loadPatientInfo();

  displayChatResponse(`<img src="/media/scene1.png" style="max-width:100%;border-radius:10px;">`);
  displayChatResponse("🚑 Dispatch: " + dispatch);
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

  sendBtn.addEventListener('click', () => {
    const msg = input.value.trim();
    if (msg) {
      processUserMessage(msg);
      input.value = '';
    }
  });

  input.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendBtn.click();
    }
  });

  startBtn.addEventListener('click', () => window.startScenario());
  endBtn.addEventListener('click', () => window.endScenario());
});
