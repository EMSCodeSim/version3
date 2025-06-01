import { initializeScoreTracker, gradeActionBySkillID, gradeScenario } from './grading.js';
import { startVoiceRecognition, stopVoiceRecognition } from './mic.js';
import { routeUserInput, loadHardcodedResponses } from './router.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let gradingTemplate = {};
let scenarioStarted = false;
let hardcodedResponses = {};
let chatLog = [];

// ---- Multi-action Handler ----
async function handleMultiActionInput(userInput) {
  const response = await fetch('/.netlify/functions/parseAndTagMultiAction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInput })
  });
  const parsedActions = await response.json();

  parsedActions.forEach(action => {
    const entry = {
      question: userInput,
      answer: action.actionText,
      tags: action.tags,
      skillSheetID: action.skillSheetID,
      scoreCategory: action.scoreCategory,
      points: action.points,
      criticalFail: action.criticalFail,
      parentInput: userInput,
      source: "gpt3.5_auto"
    };
    // Save to Firebase for review/expansion
    firebase.database().ref("/hardcodedResponses/").push(entry);
    // --- SKILL SHEET GRADING HERE ---
    if (entry.skillSheetID) gradeActionBySkillID(entry.skillSheetID);
    onResponseScored(entry);
  });

  return parsedActions.map(a => a.actionText).join(" | ");
}

function containsMultipleActions(text) {
  return text.includes(" and ") || text.includes(",") || text.includes(" then ");
}

// ---- Scenario Grading Summary ----
async function displayScenarioGrading() {
  const gradingHtml = await gradeScenario();
  document.getElementById('chat-box').insertAdjacentHTML('beforeend', gradingHtml);
}

// ---- Audio, TTS, Mic, etc. (no changes needed) ----
function playAudio(src, callback) { /* ...unchanged... */ }
function speakOnce(text, voiceName = "", rate = 1.0, callback) { /* ...unchanged... */ }
async function displayChatResponse(response, question = "", role = "", audioUrl = null, source = "", userInput = "", doSpeak = true) { /* ...unchanged... */ }
async function getTTSAudioFromFirebase(question) { /* ...unchanged... */ }
function disableMic() { /* ...unchanged... */ }
function enableMic() { /* ...unchanged... */ }

// ---- Grading Template Loader ----
async function loadGradingTemplate(type = "medical") {
  const file = `grading_templates/${type}_assessment.json`;
  const res = await fetch(file);
  gradingTemplate = await res.json();
  initializeScoreTracker(gradingTemplate);
}

// ---- Proctor Logic ----
function isProctorQuestion(message) { /* ...unchanged... */ }

// ---- Core User Input Processor ----
async function processUserMessage(message) {
  if (!message) return;
  chatLog.push("You: " + message);

  const role = isProctorQuestion(message) ? "Proctor" : "Patient";

  try {
    // --- MULTI-ACTION HANDLER ---
    if (containsMultipleActions(message)) {
      const multiResponse = await handleMultiActionInput(message);
      displayChatResponse(multiResponse, message, `${role} (multi-action)`, null, "gpt3.5_auto");
      return;
    }

    // --- ROUTING LOGIC: Hardcoded/Vector/GPT ---
    const { response, source, matchedEntry } = await routeUserInput(message, {
      scenarioId: scenarioPath,
      role: role.toLowerCase(),
    });
    chatLog.push(role + ": " + response);

    let ttsAudio = null;
    if (source === "hardcoded") {
      ttsAudio = await getTTSAudioFromFirebase(message);
      if (ttsAudio && !ttsAudio.startsWith("http") && !ttsAudio.startsWith("data:audio"))
        ttsAudio = `data:audio/mp3;base64,${ttsAudio}`;
    }

    displayChatResponse(response, message, `${role} (${source})`, ttsAudio, source, message, !!ttsAudio);

    // --- SKILL SHEET GRADING (for both hardcoded and GPT-matched) ---
    let skillSheetID = null;
    if (matchedEntry && matchedEntry.skillSheetID) {
      skillSheetID = matchedEntry.skillSheetID;
    } else if (source && response && response.skillSheetID) {
      skillSheetID = response.skillSheetID;
    }
    if (skillSheetID) gradeActionBySkillID(skillSheetID);

    // --- Live skill sheet update ---
    if (matchedEntry) onResponseScored(matchedEntry);

  } catch (err) {
    logErrorToDatabase("processUserMessage error: " + err.message);
    displayChatResponse("❌ AI response failed. Try again.", "", "", null, "", "", false);
  }
}

// ---- Scenario Files Loader ----
async function loadDispatchInfo() { /* ...unchanged... */ }
async function loadPatientInfo() { /* ...unchanged... */ }
function logErrorToDatabase(errorInfo) { /* ...unchanged... */ }

// ---- Scenario Start ----
window.startScenario = async function () {
  if (scenarioStarted) return;
  try {
    console.log("🚀 Start button tapped. Starting scenario...");
    await loadHardcodedResponses();

    const snapshot = await firebase.database().ref('hardcodedResponses').once('value');
    hardcodedResponses = snapshot.val() || {};
    console.log("✅ Hardcoded responses loaded.");

    const configRes = await fetch(`${scenarioPath}config.json`);
    if (!configRes.ok) throw new Error("Missing config.json");
    const config = await configRes.json();
    console.log("✅ Config file loaded:", config);

    await loadGradingTemplate(config.grading || "medical");

    const dispatch = await loadDispatchInfo();
    patientContext = await loadPatientInfo();

    displayChatResponse(`🚑 Dispatch: ${dispatch}`, "", "", null, "", "", false);
    speakOnce(dispatch, "", 1.0);

    scenarioStarted = true;
  } catch (err) {
    console.error("❌ startScenario error:", err.message);
    displayChatResponse("❌ Failed to load scenario. Check config.json, dispatch.txt, and patient.txt.", "", "", null, "", "", false);
    scenarioStarted = false;
  }
};

// ---- Scenario End/Grading ----
window.endScenario = async function () {
  await displayScenarioGrading();
  scenarioStarted = false;
};

// ---- UI/DOM event setup ----
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('send-button');
  const input = document.getElementById('user-input');
  const startBtn = document.getElementById('start-button');
  const endBtn = document.getElementById('end-button');
  const micBtn = document.getElementById('mic-button');

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

  if (startBtn) startBtn.addEventListener('click', () => {
    if (typeof window.startScenario === 'function') window.startScenario();
  });

  if (endBtn) endBtn.addEventListener('click', () => {
    if (typeof window.endScenario === 'function') window.endScenario();
  });

  if (micBtn) micBtn.addEventListener('click', () => {
    if (typeof startVoiceRecognition === 'function') startVoiceRecognition();
  });
});

// --- Skill Sheet (Live) Marking (for learning mode) ---
function markSkillSheetStep(skillSheetID) {
  const el = document.getElementById(skillSheetID);
  if (el && el.querySelector(".status").textContent !== "✅") {
    el.querySelector(".status").textContent = "✅";
  }
}

function onResponseScored(entry) {
  if (document.getElementById("learningModeToggle")?.checked && entry.skillSheetID) {
    markSkillSheetStep(entry.skillSheetID);
  }
}
