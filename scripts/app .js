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
  initializeScoreTracker();
}

// Initialize scoring
function initializeScoreTracker() {
  for (let key in gradingTemplate) {
    if (key !== "criticalFails") {
      scoreTracker[key] = false;
    }
  }
  scoreTracker.criticalFails = [];
}

// Track points for matched actions
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

// Final formatted skill sheet output
function gradeScenario() {
  const mockStart = "18:53";
  const mockEnd = "19:08";
  let score = 0;
  let missed = [];
  let criticalFails = scoreTracker.criticalFails || [];

  for (let key in scoreTracker) {
    if (key !== "criticalFails") {
      if (scoreTracker[key]) score++;
      else missed.push(key);
    }
  }

  function check(key, label, points = 1) {
    const passed = scoreTracker[key];
    return `<li>${passed ? "✔" : "✘"} ${label} (${passed ? points : 0})</li>`;
  }

  const html = `
    <div class="grading-summary">
      <h2>Patient Assessment - Medical (NREMT Skill Sheet)</h2>
      <p><strong>Candidate:</strong> __________________ &nbsp;&nbsp;&nbsp; <strong>Scenario:</strong> Chest Pain</p>
      <p><strong>Time Started:</strong> ${mockStart} &nbsp;&nbsp;&nbsp; <strong>Time Ended:</strong> ${mockEnd}</p>

      <h3>PPE & Scene Size-Up</h3>
      <ul>
        ${check("BSI", "Takes or verbalizes PPE precautions")}
        ${check("sceneSafety", "Determines scene is safe")}
        ${check("mechanismInjury", "Determines nature of illness")}
        ${check("numberPatients", "Determines number of patients")}
        ${check("additionalHelp", "Requests help if needed")}
        ${check("cSpine", "Considers spinal stabilization")}
      </ul>

      <h3>Primary Assessment</h3>
      <ul>
        ${check("generalImpression", "General impression")}
        ${check("responsiveness", "Responsiveness/LOC")}
        ${check("chiefComplaint", "Chief complaint/life threats")}
        <li>${scoreTracker.airwayAssessment ? "✔" : "✘"} Airway assessment, ventilation, oxygen therapy (3)</li>
        <li>${scoreTracker.circulationAssessment ? "✔" : "✘"} Major bleeding, pulse, skin (3)</li>
        ${check("priorityTransport", "Priority transport decision")}
      </ul>

      <h3>History Taking (OPQRST + SAMPLE)</h3>
      <ul>
        ${check("OPQRST", "OPQRST history")}
        ${check("SAMPLE", "SAMPLE history")}
      </ul>

      <h3>Secondary Assessment</h3>
      <ul>${check("secondaryAssessment", "Focused or rapid physical exam")}</ul>

      <h3>Vital Signs</h3>
      <ul>${check("vitalSigns", "Pulse, BP, Respiratory rate, AVPU")}</ul>

      <h3>Reassessment</h3>
      <ul>
        ${check("fieldImpression", "Field impression")}
        ${check("treatmentPlan", "Treatment/interventions")}
        ${check("reassessment", "Reassess primary, vitals, complaint")}
      </ul>

      <h3>Total Points: <strong>${score} / 48</strong></h3>

      <h3>Critical Failures:</h3>
      <ul class="critical-fails">
        ${criticalFails.length > 0 ? criticalFails.map(c => `<li>✘ ${c}</li>`).join("") : "<li>None</li>"}
      </ul>
    </div>
  `;

  return html;
}

// Speak text
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
    const audioBlob = new Blob([Uint8Array.from(atob(audio), c => c.charCodeAt(0))], { type: "audio/mpeg" });
    const url = URL.createObjectURL(audioBlob);
    const player = new Audio(url);
    player.play();
  } catch (err) {
    console.error("TTS playback error:", err);
  }
}

// Display message
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

// Hardcoded response match
function checkHardcodedResponse(message) {
  const normalized = message.trim().toLowerCase();
  for (const key in hardcodedResponses) {
    const stored = hardcodedResponses[key];
    if (stored?.userQuestion?.trim().toLowerCase() === normalized) return stored;
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

// Handle user message
async function processUserMessage(message) {
  const proctorKeywords = ['scene safe', 'bsi', 'blood pressure', 'pulse', 'respiratory rate', 'oxygen', 'splint', 'epinephrine'];
  const role = proctorKeywords.some(k => message.toLowerCase().includes(k)) ? "proctor" : "patient";
  updateScoreTracker(message);

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
    firebase.database().ref('unknownQuestions').push({ userQuestion: message, aiResponse: gpt, role, reviewed: false, timestamp: Date.now() });
    firebase.database().ref('ai_responses_log').push({ userMessage: message, aiResponse: gpt, responder: role, timestamp: Date.now() });
    return displayChatResponse(gpt, message, role === "proctor" ? "🧑‍⚕️ Proctor" : "🧍 Patient");
  }

  return displayChatResponse("I'm not sure how to answer that right now. Your question has been logged for review.", message, role === "proctor" ? "🧑‍⚕️ Proctor" : "🧍 Patient");
}

// Start scenario and grading
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

// End scenario and show final report
window.endScenario = function () {
  const feedback = gradeScenario();
  displayChatResponse(feedback);
};

// DOM events
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

// Utility loaders
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
