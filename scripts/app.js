import { loadHardcodedResponses, routeUserInput } from './router.js';
import { initializeScoreTracker, gradeActionBySkillID, gradeScenario } from './grading.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let gradingTemplate = {};
window.scenarioStarted = false;
let chatLog = [];

function displayChatResponse(message, userMessage, role, ttsAudio, source, original, hasAudio) {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return;
  const div = document.createElement('div');
  div.innerHTML = `<b>${role ? role + ": " : ""}</b>${message}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  if (ttsAudio) playAudio(ttsAudio);
}

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

function logErrorToDatabase(errorInfo) {
  console.error("🔴", errorInfo);
}

window.startScenario = async function () {
  if (window.scenarioStarted) return;
  const spinner = document.getElementById('loading-spinner');
  try {
    if (spinner) spinner.style.display = "block";
    console.log("startScenario: called.");

    // 1. Load hardcoded responses
    await loadHardcodedResponses();
    console.log("startScenario: responses loaded:", window.hardcodedResponsesArray?.length);

    // 2. Load config.json
    const configRes = await fetch(`${scenarioPath}config.json`);
    console.log("startScenario: config fetch response:", configRes.status);
    if (!configRes.ok) throw new Error("Missing config.json");
    const config = await configRes.json();
    console.log("startScenario: config loaded", config);

    // 3. Load grading template
    if (config.grading) {
      await loadGradingTemplate(config.grading || "medical");
      window.updateSkillChecklistUI && window.updateSkillChecklistUI();
    }

    // 4. Load dispatch info
    const dispatchRes = await fetch(`${scenarioPath}dispatch.txt`);
    console.log("startScenario: dispatch fetch response:", dispatchRes.status);
    if (!dispatchRes.ok) throw new Error("Missing dispatch.txt");
    const dispatch = await dispatchRes.text();
    console.log("startScenario: dispatch loaded", dispatch);

    // 5. Load patient info
    const patientRes = await fetch(`${scenarioPath}patient.txt`);
    console.log("startScenario: patient fetch response:", patientRes.status);
    if (!patientRes.ok) throw new Error("Missing patient.txt");
    patientContext = await patientRes.text();
    console.log("startScenario: patient context loaded", patientContext);

    // 6. Reset grading and checklist
    window.resetSkillChecklistUI && window.resetSkillChecklistUI();

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
    console.log("startScenario: done, spinner hidden");
  }
};

// Load the grading template file (JSON) and initialize the tracker
async function loadGradingTemplate(type = "medical") {
  const file = `grading_templates/${type}_assessment.json`;
  const res = await fetch(file);
  if (!res.ok) throw new Error(`Grading template not found: ${file}`);
  gradingTemplate = await res.json();
  initializeScoreTracker(gradingTemplate);
  window.updateSkillChecklistUI && window.updateSkillChecklistUI();
}

async function processUserMessage(message) {
  if (!message) return;
  const chatBox = document.getElementById('chat-box');
  const userDiv = document.createElement('div');
  userDiv.innerHTML = `<b>You:</b> ${message}`;
  chatBox.appendChild(userDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const { response, source, matchedEntry } = await routeUserInput(message, {
      scenarioId: scenarioPath,
      role: "user"
    });
    const replyDiv = document.createElement('div');
    replyDiv.innerHTML = `<b>Patient:</b> ${response}`;
    chatBox.appendChild(replyDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Grading integration: if response has a scoreCategory, grade it and update checklist!
    if (matchedEntry && matchedEntry.scoreCategory) {
      gradeActionBySkillID(matchedEntry.scoreCategory);
      window.updateSkillChecklistUI && window.updateSkillChecklistUI();
    }

  } catch (err) {
    const errDiv = document.createElement('div');
    errDiv.innerHTML = `<b>System:</b> ❌ AI processing error: ${err.message}`;
    chatBox.appendChild(errDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

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
