const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let hardcodedResponses = {};
let gradingTemplate = {};
let scoreTracker = {};

firebase.database().ref('hardcodedResponses').once('value').then(snapshot => {
  hardcodedResponses = snapshot.val() || {};
  console.log("✅ Loaded hardcodedResponses:", hardcodedResponses);
});

async function loadGradingTemplate(type = "medical") {
  try {
    const file = `grading_templates/${type}_assessment.json`;
    const res = await fetch(file);
    gradingTemplate = await res.json();
    initializeScoreTracker();
    console.log(`✅ Loaded grading template: ${type}`);
  } catch (err) {
    logErrorToDatabase("Failed to load grading template: " + err.message);
  }
}

function initializeScoreTracker() {
  for (let key in gradingTemplate) {
    if (key !== "criticalFails") scoreTracker[key] = false;
  }
  scoreTracker.criticalFails = [];
}

function updateScoreTracker(input) {
  const msg = input.toLowerCase();
  if (msg.includes("scene safe")) scoreTracker.sceneSafety = true;
  if (msg.includes("gloves") || msg.includes("bsi")) scoreTracker.BSI = true;
  if (msg.includes("nature of illness")) scoreTracker.mechanismInjury = true;
  if (msg.includes("number of patients")) scoreTracker.numberPatients = true;
  if (msg.includes("call for help")) scoreTracker.additionalHelp = true;
  if (msg.includes("c-spine")) scoreTracker.cSpine = true;
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
  if (scoreTracker.criticalFails.length > 0) output.push("❌ Critical Fails: " + scoreTracker.criticalFails.join(", "));
  if (missed.length > 0) output.push("🔍 Missed: " + missed.join("; "));
  return output.join("<br><br>");
}

function logErrorToDatabase(msg) {
  console.error("🔥 Error:", msg);
  firebase.database().ref('error_logs').push({ error: msg, timestamp: Date.now() });
}

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
    console.error("TTS error:", err);
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

// Start Scenario
window.startScenario = async function () {
  console.log("🟢 Start button clicked");
  try {
    const configRes = await fetch(`${scenarioPath}config.json`);
    const config = await configRes.json();
    await loadGradingTemplate(config.grading || "medical");

    const dispatch = await loadDispatchInfo();
    patientContext = await loadPatientInfo();

    displayChatResponse(`<img src="/media/scene1.png" style="max-width:100%; border-radius:12px;">`);
    displayChatResponse(`🚑 Dispatch: ${dispatch}`);
  } catch (err) {
    displayChatResponse("❌ Scenario failed to load. Check config or file structure.");
    logErrorToDatabase("startScenario error: " + err.message);
  }
};

// End Scenario
window.endScenario = function () {
  const feedback = gradeScenario();
  displayChatResponse("📦 Scenario ended. Here's your performance summary:<br><br>" + feedback);
};

// DOM Event Handlers
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
