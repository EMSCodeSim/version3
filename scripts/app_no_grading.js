import { initializeScoreTracker, updateScoreTracker, gradeScenario } from './grading.js';
const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let hardcodedResponses = {};
let gradingTemplate = {};
let scoreTracker = {};

// Load hardcoded responses from Firebase
firebase.database().ref('hardcodedResponses').once('value').then(snapshot => {
  hardcodedResponses = snapshot.val() || {};
  console.log("✅ Loaded hardcodedResponses:", hardcodedResponses);
});

// Load grading template dynamically based on scenario config
async function loadGradingTemplate(type = "medical") {
  const file = `grading_templates/${type}_assessment.json`;
  const res = await fetch(file);
  gradingTemplate = await res.json();
  
}

  
}

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
  const speaker = role.toLowerCase().includes("proctor") ? "proctor" : "patient";
  speak(response, speaker, audioUrl);
}

// Check for exact hardcoded match
function checkHardcodedResponse(message) {
  if (!hardcodedResponses || typeof hardcodedResponses !== 'object') return null;
  const normalized = message.trim().toLowerCase();
  for (const key in hardcodedResponses) {
    const stored = hardcodedResponses[key];
    if (stored && stored.userQuestion && stored.aiResponse) {
      const storedNormalized = stored.userQuestion.trim().toLowerCase();
      if (storedNormalized === normalized) {
        console.log("✅ Hardcoded match found:", storedNormalized);
        return stored;
      }
    }
  }
  return null;
}

// Vector search fallback
async function getVectorResponse(message) {
  try {
    const res = await fetch('/api/vector-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message })
    });
    const data = await res.json();
    console.log("🔍 Vector match:", data.match);
    return data.match || null;
  } catch (e) {
    logErrorToDatabase("Vector search failed: " + e.message);
    return null;
  }
}

// GPT-4 fallback
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

// Main message handler
async function processUserMessage(message) {
  const proctorKeywords = [
    'scene safe', 'bsi', 'blood pressure', 'pulse', 'respiratory rate', 'oxygen', 'splint', 'epinephrine'
  ];
  const role = proctorKeywords.some(k => message.toLowerCase().includes(k)) ? "proctor" : "patient";

  

  const hardcoded = checkHardcodedResponse(message);
  if (hardcoded?.aiResponse) {
    return displayChatResponse(hardcoded.aiResponse, message, role === "proctor" ? "🧑‍⚕️ Proctor" : "🧍 Patient", hardcoded.audioUrl || null);
  }

  const vector = await getVectorResponse(message);
  if (vector) {
    return displayChatResponse(vector, message, role === "proctor" ? "🧑‍⚕️ Proctor" : "🧍 Patient");
  }

  const gpt = await getAIResponseGPT4Turbo(message);
  if (gpt) {
    firebase.database().ref('unknownQuestions').push({
      userQuestion: message,
      aiResponse: gpt,
      role,
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

  return displayChatResponse("I'm not sure how to answer that right now. Your question has been logged for review.", message, role === "proctor" ? "🧑‍⚕️ Proctor" : "🧍 Patient");
}

// Load scenario and grading template
window.startScenario = async function () {
  try {
    const configRes = await fetch(`${scenarioPath}config.json`);
    const config = await configRes.json();
    const gradingType = config.grading || "medical";

    await loadGradingTemplate(gradingType);

    const dispatch = await loadDispatchInfo();
    patientContext = await loadPatientInfo();
    displayChatResponse(`🚑 Dispatch: ${dispatch}`);
  } catch (err) {
    logErrorToDatabase("startScenario error: " + err.message);
    displayChatResponse("❌ Failed to load scenario. Check for missing grading or config files.");
  }
};

// End scenario and show score
window.endScenario = function () {
  
  displayChatResponse("📦 Scenario ended. Here's your performance summary:<br><br>" + feedback);
};

// DOM events for buttons
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

// Load supporting files
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
