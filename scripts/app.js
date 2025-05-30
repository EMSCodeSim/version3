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

// ---- New: Multi-action Handler ----
async function handleMultiActionInput(userInput) {
  const response = await fetch('/.netlify/functions/parseAndTagMultiAction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInput })
  });

  const parsedActions = await response.json();

  parsedActions.forEach(action => {
    const entry = {
      question: userInput,
      answer: action.actionText,
      tags: action.tags,
      skillSheetID: action.skillSheetID,
      scoreCategory: action.scoreCategory,
      points: action.points,
      criticalFail: action.criticalFail,
      parentInput: userInput,
      source: "gpt3.5_auto"
    };

    firebase.database().ref("/hardcodedResponses/").push(entry);
  });

  return parsedActions.map(a => a.actionText).join(" | ");
}

function containsMultipleActions(text) {
  return text.includes(" and ") || text.includes(",") || text.includes(" then ");
}

// ---- Handoff Rubric HTML ----
const handoffRubricHtml = `
  <div class="chat-message system" id="handoffRubricMsg" style="background:#eafdff; border-left:4px solid #1976d2; border-radius:8px; margin:10px 0; padding:10px 18px; font-size:1rem;">
    <b>Handoff Grading Rubric:</b>
    <ul style="margin:8px 0 0 0; padding-left:20px;">
      <li><b>Age/Sex</b></li>
      <li><b>Chief Complaint</b></li>
      <li><b>MOI/NOI</b> (Mechanism/Nature of Illness)</li>
      <li><b>Pertinent History</b> (meds, allergies, relevant hx)</li>
      <li><b>Assessment Findings</b> (incl. most recent vitals)</li>
      <li><b>Interventions Provided</b></li>
      <li><b>Response to Interventions / Trends</b></li>
      <li><b>Ongoing Needs / Requests</b></li>
    </ul>
  </div>
`;

function displayScenarioGrading(gradingResults) {
  const items = [
    { key: 'ageSex', label: 'Age/Sex' },
    { key: 'chiefComplaint', label: 'Chief Complaint' },
    { key: 'moiNoi', label: 'MOI/NOI' },
    { key: 'history', label: 'Pertinent History' },
    { key: 'assessment', label: 'Assessment Findings' },
    { key: 'interventions', label: 'Interventions Provided' },
    { key: 'response', label: 'Response to Interventions / Trends' },
    { key: 'ongoingNeeds', label: 'Ongoing Needs / Requests' }
  ];
  let html = `<div class="chat-message system" id="mainGradingRubric"
    style="background:#f3faff; border-left:4px solid #36b37e; border-radius:8px; margin:12px 0 8px 0; padding:10px 16px; font-size:1rem; max-width:430px;">
    <b>Scenario Grading Summary</b>
    <ul style="margin:9px 0 0 0; padding-left:20px;">`;
  items.forEach(item => {
    let value = gradingResults[item.key];
    if (!value || value.toLowerCase().includes('missing') || value.toLowerCase().includes('not documented')) {
      value = `<span style="color:#e23c3c;">${value || "missing"}</span>`;
    }
    html += `<li><b>${item.label}:</b> ${value}</li>`;
  });
  html += `</ul></div>`;
  document.getElementById('chat-box').insertAdjacentHTML('beforeend', html);
}

function playAudio(src, callback) {
  document.querySelectorAll("audio#scenarioTTS").forEach(audio => {
    try { audio.pause(); } catch (e) {}
    audio.remove();
  });

  const chatBox = document.getElementById("chat-box");
  const audioElement = document.createElement("audio");
  audioElement.id = "scenarioTTS";
  audioElement.src = src;
  audioElement.setAttribute("controls", "controls");
  audioElement.setAttribute("autoplay", "autoplay");
  audioElement.style.marginTop = "10px";
  audioElement.playbackRate = 1.25;
  chatBox.appendChild(audioElement);

  disableMic();

  const cleanup = () => {
    const micBtn = document.getElementById('mic-button');
    if (micBtn) micBtn.disabled = false;
    try { audioElement.remove(); } catch (e) {}
    if (typeof callback === "function") callback();
  };

  audioElement.addEventListener('ended', cleanup);
  audioElement.addEventListener('error', cleanup);

  audioElement.play().catch(err => {
    console.warn("Autoplay failed:", err.message);
    cleanup();
  });
}

function speakOnce(text, voiceName = "", rate = 1.0, callback) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  if (voiceName) {
    const voices = speechSynthesis.getVoices();
    utter.voice = voices.find(v => v.name === voiceName) || null;
  }
  utter.rate = rate;
  utter.onend = () => { if (callback) callback(); };
  window.speechSynthesis.speak(utter);
}
async function displayChatResponse(
  response,
  question = "",
  role = "",
  audioUrl = null,
  source = "",
  userInput = "",
  doSpeak = true
) {
  const chatBox = document.getElementById("chat-box");
  const roleClass = role.toLowerCase().includes("proctor") ? "proctor-bubble" : "patient-bubble";

  if (question) {
    chatBox.innerHTML += `<div class="question">🗣️ <b>You:</b> ${question}</div>`;
  }

  chatBox.innerHTML += `<div class="response ${roleClass}">${role ? `<b>${role}:</b> ` : ""}${response}</div>`;

  if (audioUrl && doSpeak) {
    let src = audioUrl.startsWith("http") || audioUrl.startsWith("data:audio") ? audioUrl : `data:audio/mp3;base64,${audioUrl}`;
    playAudio(src);
  }
  chatBox.scrollTop = chatBox.scrollHeight;
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

function disableMic() {
  const micBtn = document.getElementById('mic-button');
  if (micBtn) micBtn.disabled = true;
  if (typeof stopVoiceRecognition === "function") stopVoiceRecognition();
}

function enableMic() {
  const micBtn = document.getElementById('mic-button');
  if (micBtn) micBtn.disabled = false;
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

async function processUserMessage(message) {
  if (!message) return;
  gradeInput(message);
  chatLog.push("You: " + message);

  const role = isProctorQuestion(message) ? "Proctor" : "Patient";

  try {
    if (containsMultipleActions(message)) {
      const multiResponse = await handleMultiActionInput(message);
      displayChatResponse(multiResponse, message, `${role} (multi-action)`, null, "gpt3.5_auto");
      return;
    }

    const { response, source } = await routeUserInput(message, {
      scenarioId: scenarioPath,
      role: role.toLowerCase(),
    });

    chatLog.push(role + ": " + response);

    let ttsAudio = null;
    if (source === "hardcoded") {
      ttsAudio = await getTTSAudioFromFirebase(message);
      if (ttsAudio && !ttsAudio.startsWith("http") && !ttsAudio.startsWith("data:audio"))
        ttsAudio = `data:audio/mp3;base64,${ttsAudio}`;
    }

    displayChatResponse(response, message, `${role} (${source})`, ttsAudio, source, message, !!ttsAudio);
  } catch (err) {
    logErrorToDatabase("processUserMessage error: " + err.message);
    displayChatResponse("❌ AI response failed. Try again.", "", "", null, "", "", false);
  }
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
    console.log("🚀 Start button tapped. Starting scenario...");
    await loadHardcodedResponses();

    const snapshot = await firebase.database().ref('hardcodedResponses').once('value');
    hardcodedResponses = snapshot.val() || {};
    console.log("✅ Hardcoded responses loaded.");

    const configRes = await fetch(`${scenarioPath}config.json`);
    if (!configRes.ok) throw new Error("Missing config.json");
    const config = await configRes.json();
    console.log("✅ Config file loaded:", config);

    await loadGradingTemplate(config.grading || "medical");

    const dispatch = await loadDispatchInfo();
    patientContext = await loadPatientInfo();

    displayChatResponse(`🚑 Dispatch: ${dispatch}`, "", "", null, "", "", false);

    speakOnce(dispatch, "", 1.0);

    scenarioStarted = true;
  } catch (err) {
    console.error("❌ startScenario error:", err.message);
    displayChatResponse("❌ Failed to load scenario. Check config.json, dispatch.txt, and patient.txt.", "", "", null, "", "", false);
    scenarioStarted = false;
  }
};

window.endScenario = async function () {
  console.log("End Scenario Clicked!");
  const gradingResults = {
    ageSex: "62 y/o male",
    chiefComplaint: "Chest pain",
    moiNoi: "Sudden onset, no trauma",
    history: "missing allergies",
    assessment: "BP 148/92, pulse 96, RR 18, SpO2 97%; skin pale, diaphoretic",
    interventions: "Oxygen via NC, aspirin given, IV started",
    response: "Pain improved after aspirin",
    ongoingNeeds: "Monitor for arrhythmia, notify receiving ER"
  };
  displayScenarioGrading(gradingResults);

  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML += handoffRubricHtml;
  chatBox.scrollTop = chatBox.scrollHeight;

  const useMic = confirm("Would you like to speak your handoff report? Click 'Cancel' to type it instead.");
  let handoff = "";

  if (useMic) {
    alert("Start speaking after clicking OK. Recording will stop automatically after ~20 seconds.");
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

        const res = await fetch("/.netlify/functions/whisper_transcribe", {
          method: "POST",
          body: JSON.stringify({ audio: base64Audio })
        });
        const data = await res.json();
        handoff = data.transcript || "";
        resolve();
      };
      mediaRecorder.stop();
    });

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.state === "recording" && mediaRecorder.stop(), 20000);
    await stopRecording();
  } else {
    handoff = prompt("Please type your full handoff report:");
  }

  let handoffGrade = "";
  let aiFeedback = "";

  if (handoff && handoff.length > 3) {
    const res = await fetch("/.netlify/functions/grade_handoff", {
      method: "POST",
      body: JSON.stringify({ handoffText: handoff })
    });
    const data = await res.json();
    handoffGrade = "<h4>Handoff Report Grading:</h4><div>" + data.result + "</div>";
  }

  const fullTranscript = chatLog.join("\\n");
  const feedbackRes = await fetch("/.netlify/functions/ai_feedback", {
    method: "POST",
    body: JSON.stringify({ transcript: fullTranscript })
  });
  const feedbackData = await feedbackRes.json();
  aiFeedback = "<h4>AI Feedback Summary:</h4><div>" + feedbackData.result + "</div>";

  const summaryHtml = `
    <hr><h3>Scenario Complete</h3>
    ${handoffGrade}
    ${aiFeedback}
  `;
  displayChatResponse(summaryHtml, "", "", null, "", "", false);
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
        if (sendBtn) sendBtn.click();
      }
    });
  }

  if (startBtn) startBtn.addEventListener('click', () => {
    if (typeof window.startScenario === 'function') window.startScenario();
  });

  if (endBtn) endBtn.addEventListener('click', () => {
    if (typeof window.endScenario === 'function') window.endScenario();
  });

  if (micBtn) micBtn.addEventListener('click', () => {
    if (typeof startVoiceRecognition === 'function') startVoiceRecognition();
  });
});
function markSkillSheetStep(skillSheetID) {
  const el = document.getElementById(skillSheetID);
  if (el && el.querySelector(".status").textContent !== "✅") {
    el.querySelector(".status").textContent = "✅";
  }
}

function onResponseScored(entry) {
  if (document.getElementById("learningModeToggle")?.checked && entry.skillSheetID) {
    markSkillSheetStep(entry.skillSheetID);
  }
}
