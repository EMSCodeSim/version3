// TTS playback using OpenAI tts-1
async function speak(text, speaker = "patient") {
  try {
    const res = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speaker })
    });

    const { audio } = await res.json(); // audio = base64

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

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let hardcodedResponses = {};

firebase.database().ref('hardcodedResponses').once('value').then(snapshot => {
  hardcodedResponses = snapshot.val() || {};
  console.log("✅ Loaded hardcodedResponses:", hardcodedResponses);
});

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

function logErrorToDatabase(errorInfo) {
  console.error("🔴 Error:", errorInfo);
  firebase.database().ref('error_logs').push({
    error: errorInfo,
    timestamp: Date.now()
  });
}

async function displayChatResponse(response, question = "", role = "") {
  const chatBox = document.getElementById("chat-box");
  const roleClass = role.toLowerCase().includes("proctor") ? "proctor-bubble" : "patient-bubble";

  chatBox.innerHTML += `
    ${question ? `<div class="question">🗣️ <b>You:</b> ${question}</div>` : ""}
    <div class="response ${roleClass}">${role ? `<b>${role}:</b> ` : ""}${response}</div>
  `;
  chatBox.scrollTop = chatBox.scrollHeight;

  const speaker = role.toLowerCase().includes("proctor") ? "proctor" : "patient";
  speak(response, speaker); // 🔈 <-- TTS integration here
}

function checkHardcodedResponse(message) {
  if (!hardcodedResponses || typeof hardcodedResponses !== 'object') return null;

  const normalized = message.trim().toLowerCase();

  for (const key in hardcodedResponses) {
    const entry = hardcodedResponses[key];
    if (!entry || typeof entry !== 'object') continue;

    const storedQuestion = (entry.userQuestion || "").trim().toLowerCase();

    if (storedQuestion === normalized || storedQuestion.includes(normalized) || normalized.includes(storedQuestion)) {
      return entry;
    }
  }

  return null;
}


async function getVectorResponse(message) {
  try {
    const res = await fetch('/api/vector-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message })
    });
    const data = await res.json();
    return data.match || null;
  } catch (e) {
    logErrorToDatabase("Vector search failed: " + e.message);
    return null;
  }
}

async function getAIResponseGPT4Turbo(message) {
  try {
    const res = await fetch('/api/gpt4-turbo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
    const data = await res.json();
    return data.reply || null;
  } catch (e) {
    logErrorToDatabase("GPT fallback failed: " + e.message);
    return null;
  }
}

async function processUserMessage(message) {
  const proctorKeywords = [
    'scene safe', 'bsi', 'scene', 'blood pressure', 'pulse', 'respiratory rate', 'saO2',
    'skin color', 'bgl', 'blood sugar', 'breath sounds', 'lung sounds', 'oxygen', 'NRB',
    'nasal cannula', 'splint', 'transport', 'stretcher', 'spinal immobilization', 'move patient',
    'position patient', 'load and go', 'procedure', 'place patient', 'emergent transport',
    'administer', 'give aspirin', 'give nitro', 'asa', 'oral glucose', 'epinephrine',
    'check pupils', 'response to painful stimuli'
  ];

  const normalized = message.toLowerCase();
  const role = proctorKeywords.some(keyword => normalized.includes(keyword)) ? "proctor" : "patient";

  const hardcoded = checkHardcodedResponse(message);
if (hardcoded && typeof hardcoded === "object") {
  return displayChatResponse(
    hardcoded.aiResponse || "[Missing aiResponse]",
    message,
    role === "proctor" ? "🧑‍⚕️ Proctor" : "🧍 Patient",
    hardcoded.audioUrl || null // Optional: pass audioUrl to speak()
  );
}


  const vector = await getVectorResponse(message);
  if (vector) {
    return displayChatResponse(vector, message, role === "proctor" ? "🧑‍⚕️ Proctor" : "🧍 Patient");
  }

  const gpt = await getAIResponseGPT4Turbo(message);
  if (gpt) {
    firebase.database().ref('unknownQuestions').push({
      userMessage: message,
      aiResponse: gpt,
      responder: role,
      reviewed: false,
      timestamp: Date.now()
    });

    firebase.database().ref('ai_responses_log').push({
      userMessage: message,
      aiResponse: gpt,
      responder: role,
      timestamp: Date.now()
    });

    return displayChatResponse(gpt, message, role === "proctor" ? "🧑‍⚕️ Proctor" : "🧍 Patient");
  }

  firebase.database().ref('unknownQuestions').push({
    userMessage: message,
    aiResponse: "No GPT response generated.",
    responder: role,
    reviewed: false,
    timestamp: Date.now()
  });

  displayChatResponse("I'm not sure how to answer that right now. Your question has been sent for instructor review.", message);
}

window.startScenario = async function () {
  const dispatch = await loadDispatchInfo();
  patientContext = await loadPatientInfo();

  displayChatResponse(`🚑 Dispatch: ${dispatch}`);
  console.log("✅ Patient context loaded internally (not displayed).");
};

window.endScenario = function () {
  displayChatResponse("📦 Scenario ended. Please complete your handoff report.");
};

window.startVoiceRecognition = function () {
  displayChatResponse("🎤 Voice recognition activated. (Simulated)");
};

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

function executeTriggers(triggers) {
  if (!Array.isArray(triggers)) return;
  triggers.forEach(trigger => {
    switch (trigger.type) {
      case "image": showImage(trigger.value); break;
      case "audio": playAudio(trigger.value); break;
      case "scenarioChange": loadScenario(trigger.value); break;
      case "miniApp": launchMiniApp(trigger.value); break;
    }
  });
}

// Run this after displaying response (inside processUserMessage or displayChatResponse):
if (entry.triggers) executeTriggers(entry.triggers);

// Trigger action handlers
function showImage(filename) {
  const imgBox = document.getElementById("image-box") || document.createElement("div");
  imgBox.id = "image-box";
  imgBox.innerHTML = `<img src="scenarios/chest_pain_002/${filename}" style="max-width:100%">`;
  document.body.appendChild(imgBox);
}

function playAudio(filename) {
  const audio = new Audio(`media/${filename}`);
  audio.play();
}

function loadScenario(id) {
  alert("Switching to scenario: " + id);
  // You would add real scenario-switch logic here
}

function launchMiniApp(name) {
  alert("Launching app: " + name);
}
