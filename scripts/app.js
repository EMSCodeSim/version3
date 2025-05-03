import { loadGradingAssets, updateScoreTracker, gradeScenario } from './grading.js';
import { checkHardcodedResponse } from './hardcoded.js';
import { startVoiceRecognition } from './mic.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let scenarioStarted = false;
let scenarioEnded = false;

firebase.database().ref('hardcodedResponses').once('value').then(snapshot => {
  console.log("✅ Loaded hardcodedResponses:", snapshot.val());
});

async function speak(text, speaker = "patient", audioUrl = null) {
  try {
    if (audioUrl) return new Audio(audioUrl).play();
    const res = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speaker })
    });
    const { audio } = await res.json();
    const blob = new Blob([Uint8Array.from(atob(audio), c => c.charCodeAt(0))], { type: "audio/mpeg" });
    new Audio(URL.createObjectURL(blob)).play();
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
  speak(response, role.toLowerCase().includes("proctor") ? "proctor" : "patient", audioUrl);
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
    logErrorToDatabase("Vector search error: " + e.message);
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
    logErrorToDatabase("GPT error: " + e.message);
    return null;
  }
}

async function processUserMessage(message) {
  const proctorKeywords = ['scene safe', 'bsi', 'blood pressure', 'pulse', 'oxygen', 'splint'];
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

  return displayChatResponse("I'm not sure how to answer that. Logging for review.", message, role === "proctor" ? "🧑‍⚕️ Proctor" : "🧍 Patient");
}

window.startScenario = async function () {
  if (scenarioStarted) return;
  scenarioStarted = true;
  scenarioEnded = false;

  try {
    const configRes = await fetch(`${scenarioPath}config.json`);
    const config = await configRes.json();
    const gradingType = config.grading || "medical";
    await loadGradingAssets(gradingType);

    const dispatch = await loadDispatchInfo();
    patientContext = await loadPatientInfo();

    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML += `
      <div class="image-block">
        <img src="/media/scene1.png" alt="Scene Image" class="scene-image" style="max-width: 100%; border: 1px solid #ccc; margin: 10px 0;" />
      </div>
    `;

    displayChatResponse(`🚑 Dispatch: ${dispatch}`);
  } catch (err) {
    logErrorToDatabase("startScenario error: " + err.message);
    displayChatResponse("❌ Failed to load scenario.");
  }
};

window.endScenario = async function () {
  if (scenarioEnded) return;
  scenarioEnded = true;

  const feedback = await gradeScenario();

  const modal = document.getElementById("scoreModal");
  const details = document.getElementById("scoreDetails");

  details.innerHTML = `
    <p><strong>Final Score:</strong> ${feedback.score} / 48 (${Math.round((feedback.score / 48) * 100)}%)</p>
    ${feedback.criticalFails.length > 0 ? `<p><strong>Critical Fails:</strong><br>${feedback.criticalFails.map(f => `- ${f}`).join("<br>")}</p>` : ""}
    <p><strong>What You Did Well:</strong><br>${feedback.positives.map(p => `✅ ${p}`).join("<br>")}</p>
    <p><strong>Improvement Tips:</strong><br>${feedback.improvementTips.map(t => `💡 ${t}`).join("<br>")}</p>
    <p><strong>Personalized Feedback:</strong><br>${feedback.gptFeedback}</p>
  `;

  modal.style.display = 'block';
  displayChatResponse(`📦 Scenario ended. Score: ${feedback.score}/48 (${Math.round((feedback.score / 48) * 100)}%)`);
};

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

  startBtn?.addEventListener('click', () => window.startScenario?.());
  endBtn?.addEventListener('click', () => window.endScenario?.());
  micBtn?.addEventListener('click', () => startVoiceRecognition?.());
});
