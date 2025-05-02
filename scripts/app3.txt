const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let hardcodedResponses = {};
let gradingTemplate = {};
let scoreTracker = {};
let micActive = false;
let recognition;

// ================== MIC CONTROL ==================
function initMic() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = true;

  recognition.onresult = function (event) {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    if (transcript) {
      document.getElementById("user-input").value = transcript;
      processUserMessage(transcript);
    }
  };

  recognition.onerror = function (event) {
    console.error("Mic error:", event.error);
  };
}

function startMic() {
  if (!recognition) initMic();
  try {
    recognition.start();
    micActive = true;
    document.getElementById("mic-button").classList.add("active");
  } catch (err) {
    console.error("Mic start error:", err);
  }
}

function stopMic() {
  if (recognition && micActive) {
    recognition.stop();
    micActive = false;
    document.getElementById("mic-button").classList.remove("active");
  }
}

// ================== SPEAK ==================
async function speak(text, speaker = "patient", audioUrl = null) {
  try {
    stopMic();
    if (audioUrl) {
      const player = new Audio(audioUrl);
      player.onended = () => startMic();
      player.play();
      return;
    }

    const res = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speaker })
    });

    const { audio } = await res.json();
    const blob = new Blob([Uint8Array.from(atob(audio), c => c.charCodeAt(0))], {
      type: "audio/mpeg"
    });
    const url = URL.createObjectURL(blob);
    const player = new Audio(url);
    player.onended = () => startMic();
    player.play();
  } catch (err) {
    console.error("TTS playback error:", err);
    startMic();
  }
}

// ================== DISPLAY RESPONSE ==================
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
// ================== GRADING LOGIC ==================
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

  function check(key, label) {
    const passed = scoreTracker[key];
    return `<li>${passed ? "✔" : "✘"} ${label}</li>`;
  }

  return `
    <div class="grading-summary">
      <h2>Patient Assessment - Medical (NREMT Skill Sheet)</h2>
      <p><strong>Time Started:</strong> ${mockStart} &nbsp;&nbsp;&nbsp; <strong>Time Ended:</strong> ${mockEnd}</p>
      <h3>Checklist</h3>
      <ul>
        ${check("BSI", "BSI Precautions")}
        ${check("sceneSafety", "Scene Safety")}
        ${check("mechanismInjury", "Nature of Illness")}
        ${check("numberPatients", "Number of Patients")}
        ${check("additionalHelp", "Request Additional Help")}
        ${check("cSpine", "Spinal Precautions")}
        ${check("generalImpression", "General Impression")}
        ${check("responsiveness", "Responsiveness")}
        ${check("chiefComplaint", "Chief Complaint")}
        ${check("airwayAssessment", "Airway Management")}
        ${check("breathingAssessment", "Breathing Assessment")}
        ${check("circulationAssessment", "Circulation Check")}
        ${check("priorityTransport", "Priority Transport Decision")}
        ${check("OPQRST", "OPQRST History")}
        ${check("SAMPLE", "SAMPLE History")}
        ${check("secondaryAssessment", "Secondary Assessment")}
        ${check("vitalSigns", "Vital Signs")}
        ${check("fieldImpression", "Field Impression")}
        ${check("treatmentPlan", "Treatment/Intervention")}
        ${check("reassessment", "Reassessment")}
      </ul>
      <p><strong>Total Points:</strong> ${score} / 48</p>
      <h3>Critical Failures:</h3>
      <ul>${criticalFails.length ? criticalFails.map(c => `<li>✘ ${c}</li>`).join('') : "<li>None</li>"}</ul>
    </div>
  `;
}

// ================== SCENARIO LOGIC ==================
async function loadGradingTemplate(type = "medical") {
  const file = `grading_templates/${type}_assessment.json`;
  const res = await fetch(file);
  gradingTemplate = await res.json();
  initializeScoreTracker();
}

window.startScenario = async function () {
  const configRes = await fetch(`${scenarioPath}config.json`);
  const config = await configRes.json();
  const gradingType = config.grading || "medical";
  await loadGradingTemplate(gradingType);

  const dispatch = await fetch(`${scenarioPath}dispatch.txt`).then(r => r.text());
  patientContext = await fetch(`${scenarioPath}patient.txt`).then(r => r.text());
  displayChatResponse(`🚑 Dispatch: ${dispatch}`);
  startMic();
};

window.endScenario = function () {
  stopMic();
  const feedback = gradeScenario();
  displayChatResponse(feedback);
};

// ================== DOM READY ==================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('send-button')?.addEventListener('click', () => {
    const message = document.getElementById('user-input').value.trim();
    if (message) {
      processUserMessage(message);
      document.getElementById('user-input').value = '';
    }
  });

  document.getElementById('start-button')?.addEventListener('click', () => window.startScenario());
  document.getElementById('end-button')?.addEventListener('click', () => window.endScenario());
  document.getElementById('mic-button')?.addEventListener('click', () => {
    if (micActive) stopMic();
    else startMic();
  });
});

function processUserMessage(message) {
  updateScoreTracker(message);
  displayChatResponse("🧠 AI is thinking...", message, "Patient");
}
