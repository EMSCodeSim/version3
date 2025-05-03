import { loadGradingAssets, updateScoreTracker, gradeScenario } from './grading.js';
import { checkHardcodedResponse } from './hardcoded.js';
import { startVoiceRecognition } from './mic.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let scenarioStarted = false;

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

let scenarioEnded = false;

let gradingTemplate = {};
let criticalFailures = [];
let improvementTips = {};
let scoreTracker = {};

export async function loadGradingAssets(type = "medical") {
  const [templateRes, failsRes, tipsRes] = await Promise.all([
    fetch(`grading_templates/${type}_assessment.json`),
    fetch(`grading_templates/critical_failures.json`),
    fetch(`grading_templates/grading_tips.json`)
  ]);

  gradingTemplate = await templateRes.json();
  criticalFailures = await failsRes.json();
  improvementTips = await tipsRes.json();

  initializeScoreTracker();
}

export function initializeScoreTracker() {
  scoreTracker = {
    completed: new Set(),
    points: 0,
    logs: [],
    userInputs: []
  };
}

export function updateScoreTracker(input) {
  const normalized = normalize(input);
  scoreTracker.userInputs.push(normalized);

  for (const key in gradingTemplate) {
    if (!scoreTracker.completed.has(key)) {
      const entry = gradingTemplate[key];
      const matches = entry.keywords.some(k => normalized.includes(k.toLowerCase()));
      if (matches) {
        scoreTracker.completed.add(key);
        scoreTracker.points += entry.points;
        scoreTracker.logs.push({ key, label: entry.label, points: entry.points });
      }
    }
  }
}

export async function gradeScenario() {
  const missedItems = Object.keys(gradingTemplate).filter(k => !scoreTracker.completed.has(k));
  const totalScore = scoreTracker.points;
  const passedItems = Array.from(scoreTracker.completed).map(k => gradingTemplate[k]?.label);
  const criticals = findCriticalFailures(scoreTracker.userInputs);

  const prompt = `
You are an NREMT evaluator. Generate professional but supportive feedback for a student.

Score: ${totalScore} / 48
Successes:
${passedItems.map(i => "- " + i).join("\n") || "None"}
Missed:
${missedItems.map(k => "- " + gradingTemplate[k]?.label).join("\n") || "None"}
Critical Failures:
${criticals.length ? criticals.map(f => "- " + f).join("\n") : "None"}

Format response with: Summary, What You Did Well, Improvement Tips.
Do NOT repeat the word 'score'.
`;

  let gptFeedback = "";
  try {
    const res = await fetch('/api/gpt4-turbo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: prompt })
    });
    const data = await res.json();
    gptFeedback = data.reply || "(No GPT feedback returned)";
  } catch (e) {
    console.error("GPT feedback error:", e.message);
    gptFeedback = "(GPT feedback unavailable)";
  }

  // Try pulling tips from improvementTips too
  const tips = missedItems
    .map(k => improvementTips[k])
    .filter(Boolean)
    .flat()
    .slice(0, 3);

  return {
    score: totalScore,
    positives: passedItems,
    improvementTips: tips.length ? tips : ["Review OPQRST thoroughly.", "Ensure scene safety and PPE are clearly stated."],
    criticalFails: criticals,
    gptFeedback
  };
}

function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/gi, '').trim();
}

function findCriticalFailures(inputs) {
  const found = [];
  for (const rule of criticalFailures) {
    if (rule.keywords.length === 0 && rule.id === "timeout") continue;
    for (const userInput of inputs) {
      const match = rule.keywords.some(keyword => userInput.includes(keyword.toLowerCase()));
      if (match) {
        found.push(rule.reason);
        break;
      }
    }
  }
  return found;
}


// DOM events with cleanup protection
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('send-button');
  const input = document.getElementById('user-input');
  const startBtn = document.getElementById('start-button');
  const endBtn = document.getElementById('end-button');
  const micBtn = document.getElementById('mic-button');

  sendBtn?.removeEventListener('click', sendBtn._clickHandler);
  sendBtn._clickHandler = () => {
    const message = input.value.trim();
    if (message) {
      processUserMessage(message);
      input.value = '';
    }
  };
  sendBtn?.addEventListener('click', sendBtn._clickHandler);

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
