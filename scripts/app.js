import { initializeScoreTracker, updateScoreTracker, gradeScenario } from './grading.js';
import { startVoiceRecognition, stopVoiceRecognition } from './mic.js';
import { routeUserInput, loadHardcodedResponses } from './router.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let gradingTemplate = {};
let scoreTracker = {};
let scenarioStarted = false;
let hardcodedResponses = {};

// --- SMART MIC CONTROL HELPERS ---
function disableMic() {
  const micBtn = document.getElementById('mic-button');
  if (micBtn) micBtn.disabled = true;
  if (window.stopVoiceRecognition) window.stopVoiceRecognition();
}
function enableMic() {
  const micBtn = document.getElementById('mic-button');
  if (micBtn) micBtn.disabled = false;
  if (window.startVoiceRecognition) window.startVoiceRecognition();
}

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

async function getTTSAudioFromFirebase(question) {
  const snapshot = await firebase.database().ref(`hardcodedResponses`).once('value');
  let result = null;
  snapshot.forEach(child => {
    const entry = child.val();
    const key = entry.userQuestion || entry.question;
    if (key && key.trim().toLowerCase() === question.trim().toLowerCase()) {
      result = entry.ttsAudio;
    }
  });
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

    displayChatResponse(response, message, `${role} (${source})`, ttsAudio, source, message);
  } catch (err) {
    logErrorToDatabase("processUserMessage error: " + err.message);
    displayChatResponse("❌ AI response failed. Try again.");
  }
}

async function displayChatResponse(response, question = "", role = "", audioUrl = null, source = "", userInput = "") {
  const chatBox = document.getElementById("chat-box");
  const roleClass = role.toLowerCase().includes("proctor") ? "proctor-bubble" : "patient-bubble";

  if (question) {
    chatBox.innerHTML += `<div class="question">🗣️ <b>You:</b> ${question}</div>`;
  }

  chatBox.innerHTML += `<div class="response ${roleClass}">${role ? `<b>${role}:</b> ` : ""}${response}</div>`;

  // --- SMART AUDIO/MIC LOGIC FOR HARD-CODED RESPONSES ---
  if (audioUrl && source === "hardcoded" && question && response) {
    let src = audioUrl.startsWith("http") ? audioUrl : `data:audio/mp3;base64,${audioUrl}`;
    // Remove any previous scenario TTS audio element
    const oldAudio = document.getElementById("scenarioTTS");
    if (oldAudio) {
      oldAudio.pause();
      oldAudio.remove();
    }
    // Create and play new audio
    const audioElement = document.createElement("audio");
    audioElement.id = "scenarioTTS";
    audioElement.src = src;
    audioElement.setAttribute("controls", "controls");
    audioElement.setAttribute("autoplay", "autoplay");
    audioElement.style.marginTop = "10px";
    chatBox.appendChild(audioElement);

    // SMART MIC CONTROL
    disableMic();
    audioElement.addEventListener('ended', enableMic);
    audioElement.play().catch(err => {
      console.warn("Autoplay failed:", err.message);
      enableMic(); // fail-safe, re-enable mic if playback fails
    });
  } else {
    speak(response, role.toLowerCase().includes("proctor") ? "proctor" : "patient");
  }

  // Trigger file (image/audio)
  if (source === "hardcoded") {
    const match = Object.values(hardcodedResponses).find(entry =>
      (entry.question || entry.userQuestion)?.trim().toLowerCase() === userInput.trim().toLowerCase()
    );

    if (match?.triggerFile && match?.triggerFileType) {
      const triggerDiv = document.createElement("div");
      triggerDiv.style.marginTop = "10px";

      if (match.triggerFileType === "image") {
        const img = document.createElement("img");
        img.src = match.triggerFile;
        img.alt = "Scenario Image";
        img.style.maxWidth = "100%";
        img.style.maxHeight = "200px";
        triggerDiv.appendChild(img);
      } else if (match.triggerFileType === "audio") {
        const audio = document.createElement("audio");
        audio.src = match.triggerFile;
        audio.controls = true;
        triggerDiv.appendChild(audio);
      }

      chatBox.appendChild(triggerDiv);
    }

    // Preview Button
    if (match?.ttsAudio) {
      const button = document.createElement("button");
      button.innerText = "▶ Preview TTS";
      button.style.marginTop = "8px";
      button.onclick = () => {
        const previewAudio = new Audio(`data:audio/mp3;base64,${match.ttsAudio}`);
        previewAudio.play().catch(err => {
          console.warn("Preview playback failed:", err);
          alert("Unable to play preview.");
        });
      };
      chatBox.appendChild(button);
    }
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

// --- SMART MIC LOGIC FOR SPEAK() (browser speech synthesis) ---
function speak(text, voice = "patient") {
  if (!window.speechSynthesis) return;
  const utterThis = new SpeechSynthesisUtterance(text);
  utterThis.voice = speechSynthesis.getVoices().find(v => v.name.toLowerCase().includes(voice)) || null;
  disableMic();
  utterThis.onend = enableMic;
  window.speechSynthesis.speak(utterThis);
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
    const snapshot = await firebase.database().ref('hardcodedResponses').once('value');
    hardcodedResponses = snapshot.val() || {};

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

// ========== GRADING SUMMARY FIX (ASYNC) ==========

window.endScenario = async function () {
  const feedback = await gradeScenario();
  const summaryHtml = `
    <hr><h3>Scenario Complete</h3>
    <div class="grading-summary">${feedback}</div>
  `;
  displayChatResponse(summaryHtml);
  scenarioStarted = false;
};

// ========== EVENT LISTENERS ==========

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

  // ONLY call the scenario function (do NOT call displayChatResponse here!)
  startBtn?.addEventListener('click', () => window.startScenario?.());
  endBtn?.addEventListener('click', () => window.endScenario?.());
  micBtn?.addEventListener('click', () => startVoiceRecognition?.());
});
