import { loadHardcodedResponses, routeUserInput } from './router.js';
import { initializeScoreTracker, gradeActionBySkillID, gradeScenario } from './grading.js';
import { startVoiceRecognition, stopVoiceRecognition } from './mic.js';

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let gradingTemplate = {};
window.scenarioStarted = false;
let chatLog = [];

function displayChatResponse(message, userMessage, role, ttsAudio, source, original, hasAudio) {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return;
  const div = document.createElement('div');
  div.innerHTML = `<b>${role ? role + ": " : ""}</b>${message}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  // Play TTS if provided
  if (ttsAudio) playAudio(ttsAudio);
}

function playAudio(src) {
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
  audioElement.play().catch(() => {});
}

function speakOnce(text, voiceName = "", rate = 1.0, callback) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new window.SpeechSynthesisUtterance(text);
  if (voiceName) {
    const voices = speechSynthesis.getVoices();
    utter.voice = voices.find(v => v.name === voiceName) || null;
  }
  utter.rate = rate;
  utter.onend = () => { if (callback) callback(); };
  window.speechSynthesis.speak(utter);
}

function logErrorToDatabase(errorInfo) {
  console.error("🔴", errorInfo);
}

window.startScenario = async function () {
  if (window.scenarioStarted) return;
  const spinner = document.getElementById('loading-spinner');
  try {
    console.log("startScenario: called.");
    if (spinner) spinner.style.display = "block";
    // 1. Load hardcoded responses from static files
    console.log("startScenario: calling loadHardcodedResponses...");
    await loadHardcodedResponses();
    console.log("startScenario: responses loaded:", window.hardcodedResponsesArray?.length);

    // 2. Load config.json
    const configRes = await fetch(`${scenarioPath}config.json`);
    console.log("startScenario: config fetch response:", configRes.status);
    if (!configRes.ok) throw new Error("Missing config.json");
    const config = await configRes.json();
    console.log("startScenario: config loaded", config);

    // 3. Load grading template
    if (config.grading) {
      await loadGradingTemplate(config.grading || "medical");
    }

    // 4. Load dispatch info
    const dispatchRes = await fetch(`${scenarioPath}dispatch.txt`);
    console.log("startScenario: dispatch fetch response:", dispatchRes.status);
    const dispatch = await dispatchRes.text();
    console.log("startScenario: dispatch loaded", dispatch);

    // 5. Load patient info
    const patientRes = await fetch(`${scenarioPath}patient.txt`);
    console.log("startScenario: patient fetch response:", patientRes.status);
    patientContext = await patientRes.text();
    console.log("startScenario: patient context loaded", patientContext);

    // 6. Show dispatch in chat
    displayChatResponse(`🚑 Dispatch: ${dispatch}`, "", "Dispatch", null, "", "", false);
    speakOnce(dispatch, "", 1.0);

    window.scenarioStarted = true;
  } catch (err) {
    console.error("startScenario ERROR:", err);
    displayChatResponse(
      "❌ Failed to load scenario. Check config.json, dispatch.txt, and patient.txt.",
      "", "System", null, "", "", false
    );
    window.scenarioStarted = false;
  } finally {
    if (typeof window.hideLoadingSpinner === "function") window.hideLoadingSpinner();
    console.log("startScenario: done, spinner hidden");
  }
};

// Other app logic for sending/receiving messages, grading, etc, can remain unchanged.

// If you want a similar spinner for End Scenario, add logic there as well!
