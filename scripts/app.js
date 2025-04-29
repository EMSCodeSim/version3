const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let hardcodedResponses = {};

// Load hardcoded Q&A from Firebase
firebase.database().ref('hardcodedResponses').once('value').then(snapshot => {
  hardcodedResponses = snapshot.val() || {};
  console.log("✅ Loaded hardcodedResponses:", hardcodedResponses);
});

// Load dispatch
async function loadDispatchInfo() {
  try {
    const res = await fetch(`${scenarioPath}dispatch.txt`);
    return await res.text();
  } catch (e) {
    logErrorToDatabase("Failed to load dispatch.txt: " + e.message);
    return "Dispatch not available.";
  }
}

// Load patient
async function loadPatientInfo() {
  try {
    const res = await fetch(`${scenarioPath}patient.txt`);
    return await res.text();
  } catch (e) {
    logErrorToDatabase("Failed to load patient.txt: " + e.message);
    return "Patient info not available.";
  }
}

// Error logger
function logErrorToDatabase(errorInfo) {
  console.error("🔴 Error:", errorInfo);
  if (firebase?.database) {
    firebase.database().ref('error_logs').push({
      error: errorInfo,
      timestamp: Date.now()
    });
  }
}

// Chat display
function displayChatResponse(response) {
  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML += `<div class="response">${response}</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Hardcoded match
function checkHardcodedResponse(message) {
  if (!hardcodedResponses) return null;
  return hardcodedResponses[message.toLowerCase()] || null;
}

// Vector fallback
async function getVectorResponse(message) {
  try {
    const res = await fetch('/api/vector-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message })
    });
    const data = await res.json();
    console.log("Vector response:", data);
    return data.match || null;
  } catch (e) {
    logErrorToDatabase("Vector search failed: " + e.message);
    return null;
  }
}

// GPT fallback
async function getAIResponseGPT4Turbo(message) {
  try {
    const fullPrompt = `Patient Info:\n${patientContext}\n\nUser asked: ${message}`;
    const res = await fetch('/api/gpt4-turbo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt })
    });
    const data = await res.json();
    console.log("GPT-4 Turbo response:", data);
    return data.reply || null;
  } catch (e) {
    logErrorToDatabase("GPT fallback failed: " + e.message);
    return null;
  }
}

// Main processor
async function processUserMessage(message) {
  console.log("User sent:", message);

  const hardcoded = checkHardcodedResponse(message);
  if (hardcoded) {
    console.log("Matched hardcoded.");
    return displayChatResponse(hardcoded);
  }

  const vector = await getVectorResponse(message);
  if (vector) {
    console.log("Matched vector.");
    return displayChatResponse(vector);
  }

  const gpt = await getAIResponseGPT4Turbo(message);
  if (gpt) {
    console.log("GPT response:", gpt);
    firebase.database().ref('ai_responses_log').push({
      userMessage: message,
      aiResponse: gpt,
      timestamp: Date.now()
    });
    return displayChatResponse(gpt);
  }

  console.warn("No response generated.");
  displayChatResponse("I'm not sure how to answer that right now.");
}

// Start scenario
startScenario = async function () {
  console.log("Scenario started.");
  const dispatch = await loadDispatchInfo();
  patientContext = await loadPatientInfo();

  displayChatResponse(`🚑 Dispatch: ${dispatch}`);
  setTimeout(() => {
    displayChatResponse(`👤 Patient: ${patientContext}`);
  }, 1000);
};

// End scenario
endScenario = function () {
  console.log("Scenario ended.");
  displayChatResponse("📦 Scenario ended. Please complete your handoff report.");
};

startVoiceRecognition = function () {
  displayChatResponse("🎤 Voice recognition activated. (Simulated)");
};

// UI bindings
document.addEventListener('DOMContentLoaded', function () {
  console.log("Page loaded: setting up buttons.");
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

  startBtn?.addEventListener('click', () => startScenario?.());
  endBtn?.addEventListener('click', () => endScenario?.());
  micBtn?.addEventListener('click', () => startVoiceRecognition?.());
});

// Global error catchers
window.onerror = function(message, source, lineno, colno, error) {
  logErrorToDatabase(`Uncaught Error: ${message} at ${source}:${lineno}:${colno}`);
};

window.addEventListener('unhandledrejection', function(event) {
  logErrorToDatabase(`Unhandled Promise Rejection: ${event.reason}`);
});
