// scripts/app.js

import { loadHardcodedResponses, routeUserInput } from './router.js';
import { initializeScoreTracker, gradeActionBySkillID } from './grading.js';

// Global state
if (!window.scoreTracker) window.scoreTracker = {};

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let gradingTemplate = {};
window.scenarioStarted = false;

// Display a message in the chat window
function displayChatResponse(message, userMessage, role, ttsAudio, source, original, hasAudio) {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return;
  const div = document.createElement('div');
  div.innerHTML = `<b>${role ? role + ": " : ""}</b>${message}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  // Optionally play TTS if provided
  if (ttsAudio) playAudio(ttsAudio);
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
    // 1. Load hardcoded responses
    await loadHardcodedResponses();

    // 2. Load config.json
    const configRes = await fetch(`${scenarioPath}config.json`);
    if (!configRes.ok) throw new Error("Missing config.json");
    const config = await configRes.json();

    // 3. Load grading template
    try {
      let gradingType = config.grading || "medical";
      await loadGradingTemplate(gradingType);
      if (window.updateSkillChecklistUI) window.updateSkillChecklistUI();
    } catch (err) {
      // Fallback if custom grading missing
      await loadGradingTemplate("medical");
      if (window.updateSkillChecklistUI) window.updateSkillChecklistUI();
    }

    // 4. Load dispatch info
    const dispatchRes = await fetch(`${scenarioPath}dispatch.txt`);
    if (!dispatchRes.ok) throw new Error("Missing dispatch.txt");
    const dispatch = await dispatchRes.text();

    // 5. Load patient info
    const patientRes = await fetch(`${scenarioPath}patient.txt`);
    if (!patientRes.ok) throw new Error("Missing patient.txt");
    patientContext = await patientRes.text();

    // 6. Reset checklist
    if (window.resetSkillChecklistUI) window.resetSkillChecklistUI();

    // 7. Show dispatch in chat
    displayChatResponse(`🚑 Dispatch: ${dispatch}`, "", "Dispatch", null, "", "", false);
    speakOnce(dispatch, "", 1.0);

    window.scenarioStarted = true;
  } catch (err) {
    console.error("startScenario ERROR:", err);
    displayChatResponse(
      "❌ Failed to load scenario: " + err.message,
      "", "System", null, "", "", false
    );
    window.scenarioStarted = false;
  } finally {
    if (typeof window.hideLoadingSpinner === "function") window.hideLoadingSpinner();
  }
};

// Load the grading template file (JSON) and initialize the tracker
async function loadGradingTemplate(type = "medical") {
  const file = `grading_templates/${type}_assessment.json`;
  const res = await fetch(file);
  if (!res.ok) throw new Error(`Grading template not found: ${file}`);
  gradingTemplate = await res.json();

  // If gradingTemplate is object-of-objects, convert to booleans
  // This ensures compatibility if file uses { "ppeBsi": {label:..., ...} }
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
  const chatBox = document.getElementById('chat-box');
  // Display the user's message
  const userDiv = document.createElement('div');
  userDiv.innerHTML = `<b>You:</b> ${message}`;
  chatBox.appendChild(userDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Route to AI/hardcoded/patient/proctor
  try {
    const { response, source, matchedEntry } = await routeUserInput(message, {
      scenarioId: scenarioPath,
      role: "user"
    });
    // Display AI/patient/proctor reply
    const replyDiv = document.createElement('div');
    replyDiv.innerHTML = `<b>Patient:</b> ${response}`;
    chatBox.appendChild(replyDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    // ---- Live grading: if this response has a scoreCategory, grade and update checklist!
    if (matchedEntry && matchedEntry.scoreCategory) {
      gradeActionBySkillID(matchedEntry.scoreCategory);
      if (window.updateSkillChecklistUI) window.updateSkillChecklistUI();
    }

    // Optionally: play audio if needed
    // if (matchedEntry && matchedEntry.ttsAudio) playAudio(matchedEntry.ttsAudio);

  } catch (err) {
    const errDiv = document.createElement('div');
    errDiv.innerHTML = `<b>System:</b> ❌ AI processing error: ${err.message}`;
    chatBox.appendChild(errDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
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

// Optional: expose for testing
window.processUserMessage = processUserMessage;
