// scripts/app.js

import { loadHardcodedResponses, routeUserInput } from './router.js';
import { initializeScoreTracker, gradeActionBySkillID } from './grading.js';

if (!window.scoreTracker) window.scoreTracker = {};

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let gradingTemplate = {};
window.scenarioStarted = false;

// Display a single role-labeled, color-coded chat bubble, clearing old ones
function displayChatResponse(message, role, ttsAudio) {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return;

  // Clear previous bubbles
  chatBox.innerHTML = '';

  const div = document.createElement('div');
  let bubbleClass = "chat-bubble system-bubble";
  let label = "";

  if (role === "patient") {
    bubbleClass = "chat-bubble patient-bubble";
    label = "Patient";
  } else if (role === "proctor") {
    bubbleClass = "chat-bubble proctor-bubble";
    label = "Proctor";
  } else if (role === "dispatch") {
    bubbleClass = "chat-bubble dispatch-bubble";
    label = "Dispatch";
  } else if (role === "system") {
    bubbleClass = "chat-bubble system-bubble";
    label = "System";
  } else if (role === "user") {
    bubbleClass = "chat-bubble user-bubble";
    label = "You";
  }

  div.className = bubbleClass;
  div.innerHTML = label ? `<b>${label}:</b> ${message}` : message;
  chatBox.appendChild(div);

  // Optionally play TTS
  if (ttsAudio) playAudio(ttsAudio);

  chatBox.scrollTop = chatBox.scrollHeight;
}

// Play TTS audio from base64 or URL
function playAudio(src) {
  document.querySelectorAll("audio#scenarioTTS").forEach(audio => {
    try { audio.pause(); } catch (e) {}
    audio.remove();
  });
  const chatBox = document.getElementById("chat-box");
  const audioElement = document.createElement("audio");
  audioElement.id = "scenarioTTS";
  audioElement.src = src;
  audioElement.setAttribute("controls", "controls");
  audioElement.setAttribute("autoplay", "autoplay");
  audioElement.style.marginTop = "10px";
  audioElement.playbackRate = 1.25;
  chatBox.appendChild(audioElement);
  audioElement.play().catch(() => {});
}

// Speak text using browser speech synthesis
function speakOnce(text, voiceName = "", rate = 1.0, callback) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new window.SpeechSynthesisUtterance(text);
  if (voiceName) {
    const voices = speechSynthesis.getVoices();
    utter.voice = voices.find(v => v.name === voiceName) || null;
  }
  utter.rate = rate;
  utter.onend = () => { if (callback) callback(); };
  window.speechSynthesis.speak(utter);
}

// Error logging (console only)
function logErrorToDatabase(errorInfo) {
  console.error("🔴", errorInfo);
}

window.startScenario = async function () {
  if (window.scenarioStarted) return;
  const spinner = document.getElementById('loading-spinner');
  try {
    if (spinner) spinner.style.display = "block";
    await loadHardcodedResponses();

    const configRes = await fetch(`${scenarioPath}config.json`);
    if (!configRes.ok) throw new Error("Missing config.json");
    const config = await configRes.json();

    try {
      let gradingType = config.grading || "medical";
      await loadGradingTemplate(gradingType);
      if (window.updateSkillChecklistUI) window.updateSkillChecklistUI();
    } catch (err) {
      await loadGradingTemplate("medical");
      if (window.updateSkillChecklistUI) window.updateSkillChecklistUI();
    }

    const dispatchRes = await fetch(`${scenarioPath}dispatch.txt`);
    if (!dispatchRes.ok) throw new Error("Missing dispatch.txt");
    const dispatch = await dispatchRes.text();

    const patientRes = await fetch(`${scenarioPath}patient.txt`);
    if (!patientRes.ok) throw new Error("Missing patient.txt");
    patientContext = await patientRes.text();

    if (window.resetSkillChecklistUI) window.resetSkillChecklistUI();

    // Show dispatch info
    displayChatResponse(`🚑 ${dispatch}`, "dispatch");
    speakOnce(dispatch, "", 1.0);

    window.scenarioStarted = true;
  } catch (err) {
    console.error("startScenario ERROR:", err);
    displayChatResponse(
      "❌ Failed to load scenario: " + err.message,
      "system"
    );
    window.scenarioStarted = false;
  } finally {
    if (typeof window.hideLoadingSpinner === "function") window.hideLoadingSpinner();
  }
};

async function loadGradingTemplate(type = "medical") {
  const file = `grading_templates/${type}_assessment.json`;
  const res = await fetch(file);
  if (!res.ok) throw new Error(`Grading template not found: ${file}`);
  gradingTemplate = await res.json();
  let firstVal = gradingTemplate[Object.keys(gradingTemplate)[0]];
  if (typeof firstVal === "object" && firstVal !== null) {
    let newTemplate = {};
    for (let key of Object.keys(gradingTemplate)) newTemplate[key] = false;
    gradingTemplate = newTemplate;
  }
  initializeScoreTracker(gradingTemplate);
  if (window.updateSkillChecklistUI) window.updateSkillChecklistUI();
}

// --- Send message logic ---
async function processUserMessage(message) {
  if (!message) return;
  // Show user bubble
  displayChatResponse(message, "user");

  // Route to AI/hardcoded/patient/proctor
  try {
    const { response, source, matchedEntry } = await routeUserInput(message, {
      scenarioId: scenarioPath,
      role: "user"
    });

    // Determine who is responding: patient or proctor
    let replyRole = "patient";
    if (matchedEntry && matchedEntry.role) {
      if (matchedEntry.role.toLowerCase().includes("proctor")) replyRole = "proctor";
      else if (matchedEntry.role.toLowerCase().includes("patient")) replyRole = "patient";
    } else if (source && source.toLowerCase().includes("proctor")) {
      replyRole = "proctor";
    }

    displayChatResponse(response, replyRole);

    if (matchedEntry && matchedEntry.scoreCategory) {
      gradeActionBySkillID(matchedEntry.scoreCategory);
      if (window.updateSkillChecklistUI) window.updateSkillChecklistUI();
    }

    // Optionally: play audio if needed
    // if (matchedEntry && matchedEntry.ttsAudio) playAudio(matchedEntry.ttsAudio);

  } catch (err) {
    displayChatResponse(`❌ AI processing error: ${err.message}`, "system");
  }
}

// Attach event listeners for Send button and Enter key
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('send-button');
  const input = document.getElementById('user-input');
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const message = input.value.trim();
      if (message) {
        processUserMessage(message);
        input.value = '';
      }
    });
  }
  if (input) {
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (sendBtn) sendBtn.click();
      }
    });
  }
});

window.processUserMessage = processUserMessage;
