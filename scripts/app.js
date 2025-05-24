import { initializeScoreTracker, updateScoreTracker, gradeScenario, gradeInput } from './grading.js';
import { startVoiceRecognition, stopVoiceRecognition } from './mic.js';
import { routeUserInput, loadHardcodedResponses } from './router.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let gradingTemplate = {};
let scoreTracker = {};
let scenarioStarted = false;
let hardcodedResponses = {};
let chatLog = [];

function disableMic() {
  const micBtn = document.getElementById('mic-button');
  if (micBtn) micBtn.disabled = true;
  if (typeof stopVoiceRecognition === "function") stopVoiceRecognition();
}

function enableMic() {
  const micBtn = document.getElementById('mic-button');
  if (micBtn) micBtn.disabled = false;
  if (typeof startVoiceRecognition === "function") startVoiceRecognition();
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
  gradeInput(message);
  chatLog.push("You: " + message);

  const role = isProctorQuestion(message) ? "Proctor" : "Patient";

  try {
    const { response, source } = await routeUserInput(message, {
      scenarioId: scenarioPath,
      role: role.toLowerCase(),
    });

    chatLog.push(`${role}: ${response}`);

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

  if (audioUrl && source === "hardcoded") {
    const src = audioUrl.startsWith("http") ? audioUrl : `data:audio/mp3;base64,${audioUrl}`;
    const oldAudio = document.getElementById("scenarioTTS");
    if (oldAudio) {
      oldAudio.pause();
      oldAudio.remove();
    }
    const audioElement = document.createElement("audio");
    audioElement.id = "scenarioTTS";
    audioElement.src = src;
    audioElement.controls = true;
    audioElement.autoplay = true;
    audioElement.style.marginTop = "10px";
    chatBox.appendChild(audioElement);

    disableMic();
    audioElement.addEventListener('ended', enableMic);
    audioElement.play().catch(() => enableMic());
  } else {
    speak(response, role.toLowerCase().includes("proctor") ? "proctor" : "patient");
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

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
    console.log("🚀 Starting scenario...");
    await loadHardcodedResponses();

    const snapshot = await firebase.database().ref('hardcodedResponses').once('value');
    hardcodedResponses = snapshot.val() || {};
    console.log("✅ Hardcoded responses loaded");

    const configRes = await fetch(`${scenarioPath}config.json`);
    if (!configRes.ok) throw new Error("Missing config.json");
    const config = await configRes.json();
    console.log("✅ Config loaded:", config);

    await loadGradingTemplate(config.grading || "medical");

    const dispatch = await loadDispatchInfo();
    patientContext = await loadPatientInfo();

    displayChatResponse(`🚑 Dispatch: ${dispatch}`);
    scenarioStarted = true;
  } catch (err) {
    console.error("❌ startScenario error:", err);
    displayChatResponse("⚠️ Failed to start scenario. Check console or file paths.");
    scenarioStarted = false;
  }
};

window.endScenario = async function () {
  console.log("End Scenario Clicked!");
  const baseFeedback = await gradeScenario();

  let handoff = "";
  const useMic = confirm("Would you like to speak your handoff report? Click 'Cancel' to type it instead.");

  if (useMic) {
    alert("Start speaking after clicking OK. Recording will stop automatically after 20 seconds.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];

    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    const stopRecording = () => new Promise(resolve => {
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        try {
          const res = await fetch("/.netlify/functions/whisper_transcribe", {
            method: "POST",
            body: JSON.stringify({ audio: base64Audio })
          });
          const data = await res.json();
          handoff = data.transcript || "";
        } catch (err) {
          console.error("Whisper error:", err.message);
        }
        resolve();
      };
      mediaRecorder.stop();
    };

    mediaRecorder.start();
    setTimeout(() => {
      if (mediaRecorder.state === "recording") mediaRecorder.stop();
    }, 20000);

    await stopRecording();
  } else {
    handoff = prompt("Please type your full handoff report:");
  }

  let handoffGrade = "";
  let aiFeedback = "";

  try {
    if (handoff && handoff.length > 3) {
      const res = await fetch("/.netlify/functions/grade_handoff", {
        method: "POST",
        body: JSON.stringify({ handoffText: handoff })
      });
      const data = await res.json();
      handoffGrade = `<h4>Handoff Report Grading:</h4><div>${data.result}</div>`;
    }

    const fullTranscript = chatLog.join("\\n");
    const feedbackRes = await fetch("/.netlify/functions/ai_feedback", {
      method: "POST",
      body: JSON.stringify({ transcript: fullTranscript })
    });
    const feedbackData = await feedbackRes.json();
    aiFeedback = `<h4>AI Feedback Summary:</h4><div>${feedbackData.result}</div>`;
  } catch (err) {
    console.error("Feedback error:", err.message);
  }

  const summaryHtml = `
    <hr><h3>Scenario Complete</h3>
    <div class="grading-summary">${baseFeedback}</div>
    ${handoffGrade}
    ${aiFeedback}
  `;
  displayChatResponse(summaryHtml);
  scenarioStarted = false;
};

document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('send-button');
  const input = document.getElementById('user-input');
  const startBtn = document.getElementById('start-button');
  const endBtn = document.getElementById('end-button');
  const micBtn = document.getElementById('mic-button');

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
        sendBtn.click();
      }
    });
  }

  if (startBtn) startBtn.addEventListener('click', () => window.startScenario && window.startScenario());
  if (endBtn) endBtn.addEventListener('click', () => window.endScenario && window.endScenario());
  if (micBtn) micBtn.addEventListener('click', () => startVoiceRecognition && startVoiceRecognition());
});
