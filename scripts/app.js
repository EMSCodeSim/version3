// === [EXISTING CODE UNCHANGED UP TO HERE] ===

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let hardcodedResponses = {};
let gradingTemplate = {};
let scoreTracker = {};

firebase.database().ref('hardcodedResponses').once('value').then(snapshot => {
  hardcodedResponses = snapshot.val() || {};
  console.log("✅ Loaded hardcodedResponses:", hardcodedResponses);
});

// === Load grading template for medical assessment ===
async function loadGradingTemplate(type = "medical") {
  const file = `grading_templates/${type}_assessment.json`;
  const res = await fetch(file);
  gradingTemplate = await res.json();
  initializeScoreTracker();
}


function initializeScoreTracker() {
  for (let key in gradingTemplate) {
    if (key !== "criticalFails") {
      scoreTracker[key] = false;
    }
  }
  scoreTracker.criticalFails = [];
}

function updateScoreTracker(input) {
  const msg = input.toLowerCase();

  if (msg.includes("scene safe")) scoreTracker.sceneSafety = true;
  if (msg.includes("gloves") || msg.includes("bsi")) scoreTracker.BSI = true;
  if (msg.includes("nature of illness")) scoreTracker.mechanismInjury = true;
  if (msg.includes("number of patients")) scoreTracker.numberPatients = true;
  if (msg.includes("call for help") || msg.includes("additional help")) scoreTracker.additionalHelp = true;
  if (msg.includes("c-spine") || msg.includes("immobilize")) scoreTracker.cSpine = true;
  if (msg.includes("general impression")) scoreTracker.generalImpression = true;
  if (msg.includes("responsive") || msg.includes("avpu")) scoreTracker.responsiveness = true;
  if (msg.includes("chief complaint")) scoreTracker.chiefComplaint = true;
  if (msg.includes("airway")) scoreTracker.airwayAssessment = true;
  if (msg.includes("breathing")) scoreTracker.breathingAssessment = true;
  if (msg.includes("pulse") || msg.includes("skin") || msg.includes("bleeding")) scoreTracker.circulationAssessment = true;
  if (msg.includes("transport decision")) scoreTracker.priorityTransport = true;
  if (msg.includes("opqrst")) scoreTracker.OPQRST = true;
  if (msg.includes("sample")) scoreTracker.SAMPLE = true;
  if (msg.includes("exam") || msg.includes("focused")) scoreTracker.secondaryAssessment = true;
  if (msg.includes("vitals") || msg.includes("blood pressure")) scoreTracker.vitalSigns = true;
  if (msg.includes("impression")) scoreTracker.fieldImpression = true;
  if (msg.includes("treatment") || msg.includes("intervention")) scoreTracker.treatmentPlan = true;
  if (msg.includes("reassess")) scoreTracker.reassessment = true;
}

function gradeScenario() {
  let score = 0;
  let missed = [];

  for (let key in scoreTracker) {
    if (key !== "criticalFails") {
      if (scoreTracker[key]) score++;
      else missed.push(gradingTemplate[key]);
    }
  }

  const total = Object.keys(gradingTemplate).length - 1;
  let output = [`📊 Final Score: ${score}/${total}`];

  if (scoreTracker.criticalFails.length > 0) {
    output.push("❌ Critical Failures: " + scoreTracker.criticalFails.join(", "));
  }

  if (missed.length > 0) {
    output.push("🔍 Missed Items: " + missed.join("; "));
  }

  return output.join("<br><br>");
}

// === [EXISTING FUNCTIONS CONTINUE] ===

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

async function getVectorResponse(message) {
  try {
    const res = await fetch('/api/vector-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message })
    });
    const data = await res.json();
    console.log("🔍 Vector match:", data.match);
    if (!data.match) console.log("🟡 No vector match found");
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
    'scene safe', 'bsi', 'blood pressure', 'pulse', 'respiratory rate', 'oxygen', 'splint', 'epinephrine'
  ];
  const role = proctorKeywords.some(k => message.toLowerCase().includes(k)) ? "proctor" : "patient";

  updateScoreTracker(message); // <-- ✅ Track actions

  const hardcoded = checkHardcodedResponse(message);
  if (hardcoded && hardcoded.aiResponse) {
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

  return displayChatResponse(
    "I'm not sure how to answer that right now. Your question has been logged for review.",
    message,
    role === "proctor" ? "🧑‍⚕️ Proctor" : "🧍 Patient"
  );
}

window.startScenario = async function () {
  try {
    // Load scenario-specific config
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


window.endScenario = function () {
  const feedback = gradeScenario(); // ✅ Show grading feedback
  displayChatResponse("📦 Scenario ended. Here's your performance summary:<br><br>" + feedback);
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
