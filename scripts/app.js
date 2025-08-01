// app.js

import { loadHardcodedResponses, routeUserInput, loadVectorDb } from './router.js';
import { initializeScoreTracker, gradeActionBySkillID } from './grading.js';
import { comboMic } from './mic.js';

if (!window.scoreTracker) window.scoreTracker = {};

let patientContext = "";
let gradingTemplate = {};
window.scenarioStarted = false;

let currentScenarioId = 'chest_pain_002'; // Default scenario
let currentScenarioPath = getCurrentScenarioPath();

function getCurrentScenarioPath() {
  return `scenarios/${currentScenarioId}/`;
}

function showScenarioPicker(show) {
  // For desktop: expects #scenario-select-container
  const pickerRow = document.getElementById('scenario-select-container');
  if (pickerRow) pickerRow.hidden = !show;
  // For mobile: expects #landing (phone.html landing screen)
  const landing = document.getElementById('landing');
  if (landing) landing.style.display = show ? '' : 'none';
}

// --- Display chat bubbles with TTS and triggers ---
function displayChatPair(userMsg, replyMsg, replyRole, ttsAudio, trigger) {
  // Use #chat-box (desktop) or #chat (mobile)
  const chatBox = document.getElementById('chat-box') || document.getElementById('chat');
  if (!chatBox) return;

  // On desktop, preserve scene image
  let scenarioImg = null;
  if (chatBox.firstChild && chatBox.firstChild.tagName === "IMG" && chatBox.firstChild.src.includes("scene1.PNG")) {
    scenarioImg = chatBox.firstChild.cloneNode(true);
  }
  // For mobile: do not clear history!
  if (chatBox.id === 'chat-box') {
    chatBox.innerHTML = "";
    if (scenarioImg) chatBox.appendChild(scenarioImg);
  }

  // TRIGGER IMAGE/AUDIO (if present)
  if (trigger && typeof trigger === "string" && trigger.trim() !== "") {
    const triggerLower = trigger.toLowerCase();
    if (!triggerLower.includes("scene1.png")) {
      if (triggerLower.match(/\.(jpe?g|png|gif|webp)$/)) {
        const img = document.createElement('img');
        img.src = `${getCurrentScenarioPath()}${trigger}`;
        img.alt = "Response Image";
        img.style.maxWidth = "100%";
        img.style.borderRadius = "10px";
        img.style.marginBottom = "14px";
        img.onerror = function() {
          this.style.display = "none";
        };
        chatBox.appendChild(img);
      }
      if (triggerLower.match(/\.(mp3|wav|m4a|ogg)$/)) {
        const audio = document.createElement('audio');
        audio.src = `${getCurrentScenarioPath()}${trigger}`;
        audio.controls = true;
        audio.style.display = "block";
        audio.style.margin = "10px 0 14px 0";
        chatBox.appendChild(audio);
      }
    }
  }

  // USER bubble
  if (userMsg && userMsg.trim()) {
    const userDiv = document.createElement('div');
    userDiv.className = "bubble user";
    userDiv.innerHTML = userMsg;
    chatBox.appendChild(userDiv);
  }

  // RESPONSE bubble: play audio first, then show text
  function showReplyBubble() {
    if (replyMsg && replyMsg.trim()) {
      let bubbleClass = "bubble system";
      if (replyRole === "patient") bubbleClass = "bubble patient";
      else if (replyRole === "proctor") bubbleClass = "bubble proctor";
      else if (replyRole === "dispatch") bubbleClass = "bubble dispatch";
      else if (replyRole === "system") bubbleClass = "bubble system";
      const replyDiv = document.createElement('div');
      replyDiv.className = bubbleClass;
      replyDiv.innerHTML = replyMsg;
      chatBox.appendChild(replyDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }

  // --- Play TTS audio before showing text ---
  if (ttsAudio) {
    let audioSrc = ttsAudio.startsWith("data:") ? ttsAudio : "data:audio/mp3;base64," + ttsAudio;
    document.querySelectorAll("audio#scenarioTTS").forEach(audio => {
      try { audio.pause(); } catch (e) {}
      audio.remove();
    });

    const audioElement = document.createElement("audio");
    audioElement.id = "scenarioTTS";
    audioElement.src = audioSrc;
    audioElement.autoplay = true;
    audioElement.style.display = "none";
    chatBox.appendChild(audioElement);

    audioElement.onended = () => {
      showReplyBubble();
      audioElement.remove();
    };
    audioElement.onerror = () => {
      showReplyBubble();
      audioElement.remove();
    };

    audioElement.play().catch(() => {
      setTimeout(showReplyBubble, 500);
    });
  } else {
    showReplyBubble();
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

// --- Play audio utility ---
function playAudio(src) {
  document.querySelectorAll("audio#scenarioTTS").forEach(audio => {
    try { audio.pause(); } catch (e) {}
    audio.remove();
  });
  const chatBox = document.getElementById("chat-box") || document.getElementById("chat");
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
async function startScenario(selectedId) {
  if (window.scenarioStarted) return;
  window.scenarioStarted = true;
  if (selectedId) {
    currentScenarioId = selectedId;
    currentScenarioPath = getCurrentScenarioPath();
  }
  showScenarioPicker(false);

  const scenarioTitle = document.getElementById('scenario-title');
  if (scenarioTitle) scenarioTitle.innerText = currentScenarioId.replace(/_/g, ' ').replace(/\d+$/, '').toUpperCase();

  const spinner = document.getElementById('loading-spinner');
  try {
    if (spinner) spinner.style.display = "block";

    let localFileUsed = false;

    // Try loading from local hard drive
    try {
      const localPath = 'file:///C:/ems/merged_database.json';
      const localRes = await fetch(localPath);
      if (localRes.ok) {
        const localData = await localRes.json();
        await loadHardcodedResponses(null, localData); // Add support in router.js if needed
        await loadVectorDb(null, localData);
        displayChatPair("", "📁 Loaded from local file", "system");
        localFileUsed = true;
      }
    } catch (localErr) {
      console.log("Local scenario not available or fetch blocked:", localErr.message);
    }

    // If local load failed, fall back to scenario folder
    if (!localFileUsed) {
      await loadHardcodedResponses(currentScenarioPath);
      await loadVectorDb(currentScenarioPath);
      displayChatPair("", "🌐 Loaded from online scenario folder", "system");
    }

    // Load config
    const configRes = await fetch(`${currentScenarioPath}config.json`);
    if (!configRes.ok) throw new Error("Missing config.json");
    const config = await configRes.json();

    try {
      let gradingType = config.grading || "medical";
      await loadGradingTemplate(gradingType);
      if (window.updateSkillChecklistUI) window.updateSkillChecklistUI();
    } catch (err) {
      await loadGradingTemplate("medical");
      if (window.updateSkillChecklistUI) window.updateSkillChecklistUI();
    }

    // Load dispatch and patient files
    const dispatchRes = await fetch(config.dispatchFile);
    if (!dispatchRes.ok) throw new Error("Missing dispatch.txt");
    const dispatch = await dispatchRes.text();

    const patientRes = await fetch(config.patientFile);
    if (!patientRes.ok) throw new Error("Missing patient.txt");
    patientContext = await patientRes.text();

    if (window.resetSkillChecklistUI) window.resetSkillChecklistUI();

    const chatBox = document.getElementById('chat-box') || document.getElementById('chat');
    if (chatBox) {
      chatBox.innerHTML = "";
      const img = document.createElement("img");
      img.src = `${currentScenarioPath}scene1.PNG`;
      img.alt = "Scene Image";
      img.style.maxWidth = "100%";
      img.style.borderRadius = "10px";
      img.style.marginBottom = "14px";
      chatBox.appendChild(img);
    }

    displayChatPair("", `🚑 ${dispatch}`, "dispatch");
    speakOnce(dispatch, "", 1.0);

  } catch (err) {
    console.error("startScenario ERROR:", err);
    displayChatPair("", "❌ Failed to load scenario: " + err.message, "system");
    window.scenarioStarted = false;
    showScenarioPicker(true);
  } finally {
    if (spinner) spinner.style.display = "none";
  }
}

// --- End Scenario handler ---
function endScenario() {
  window.scenarioStarted = false;
  const chatBox = document.getElementById('chat-box') || document.getElementById('chat');
  if (chatBox) chatBox.innerHTML += `<div class="bubble system">Scenario ended.</div>`;
  showScenarioPicker(true);
}

// --- Grading template loader ---
async function loadGradingTemplate(type = "medical") {
  const file = `grading_templates/${type}_assessment.json`;
  const res = await fetch(file);
  if (!res.ok) throw new Error(`Grading template not found: ${file}`);
  gradingTemplate = await res.json();
  let firstVal = gradingTemplate[Object.keys(gradingTemplate)[0]];
  if (typeof firstVal === "object" && firstVal !== null) {
    let newTemplate = {};
    for (let key of Object.keys(gradingTemplate)) newTemplate[key] = false;
    gradingTemplate = newTemplate;
  }
  initializeScoreTracker(gradingTemplate);
  if (window.updateSkillChecklistUI) window.updateSkillChecklistUI();
}

// --- Send message logic ---
async function processUserMessage(message) {
  if (!message) return;

  try {
    const scenarioPath = getCurrentScenarioPath();
    const { response, source, matchedEntry } = await routeUserInput(message, {
      scenarioId: scenarioPath, // <-- Full path, as expected by your router!
      role: "user"
    });

    console.log("Answer source:", source, matchedEntry);

    let replyRole = "patient";
    if (matchedEntry && matchedEntry.role) {
      if (matchedEntry.role.toLowerCase().includes("proctor")) replyRole = "proctor";
      else if (matchedEntry.role.toLowerCase().includes("patient")) replyRole = "patient";
    } else if (source && source.toLowerCase().includes("proctor")) {
      replyRole = "proctor";
    }

    let ttsAudio = null;
    if (matchedEntry && matchedEntry.ttsAudio) {
      ttsAudio = matchedEntry.ttsAudio.startsWith("data:")
        ? matchedEntry.ttsAudio
        : "data:audio/mp3;base64," + matchedEntry.ttsAudio;
    }

    displayChatPair(
      message,
      `[${source}] ${response}`,
      replyRole,
      ttsAudio,
      matchedEntry && matchedEntry.trigger
    );

    // Skill Sheet Grading
    if (matchedEntry && (matchedEntry.skillSheetID || matchedEntry["Skill Sheet ID"])) {
      let skillKey = matchedEntry.skillSheetID || matchedEntry["Skill Sheet ID"];
      gradeActionBySkillID(skillKey);
      if (window.updateSkillChecklistUI) window.updateSkillChecklistUI();
    }

  } catch (err) {
    displayChatPair(message, `❌ AI processing error: ${err.message}`, "system");
  }
}

// --- Picker and UI logic ---
window.addEventListener('DOMContentLoaded', () => {
  // Desktop picker
  const picker = document.getElementById('scenario-picker');
  if (picker) {
    picker.addEventListener('change', (e) => {
      currentScenarioId = e.target.value;
      currentScenarioPath = getCurrentScenarioPath();
    });
  }
  const startBtn = document.getElementById('start-scenario-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      currentScenarioId = picker.value;
      currentScenarioPath = getCurrentScenarioPath();
      startScenario();
    });
  }
  // Mobile picker (phone.html)
  const landingSelect = document.getElementById('scenario-select');
  const landingStartBtn = document.getElementById('start-btn');
  if (landingSelect && landingStartBtn) {
    landingSelect.addEventListener('change', function() {
      currentScenarioId = this.value;
      currentScenarioPath = getCurrentScenarioPath();
      landingStartBtn.disabled = !currentScenarioId;
    });
    landingStartBtn.addEventListener('click', function() {
      if (currentScenarioId) startScenario(currentScenarioId);
    });
  }

  // End Scenario button
  const endBtn = document.getElementById('end-button');
  if (endBtn) {
    endBtn.addEventListener('click', () => {
      endScenario();
    });
  }

  // Show picker on initial load
  showScenarioPicker(true);

  // Mic button: Use combo mic (browser STT or Whisper fallback)
  const micBtn = document.getElementById('mic-button') || document.getElementById('mic-btn');
  if (micBtn) {
    micBtn.onclick = comboMic;
  }

  // Send/Enter logic (desktop)
  const sendBtn = document.getElementById('send-button');
  const input = document.getElementById('user-input');
  if (sendBtn && input) {
    sendBtn.addEventListener('click', () => {
      const message = input.value.trim();
      if (message) {
        processUserMessage(message);
        input.value = '';
      }
    });
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendBtn.click();
      }
    });
  }
  // Send/Enter logic (mobile)
  if (input && !sendBtn) {
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        processUserMessage(input.value.trim());
        input.value = '';
      }
    });
  }
});

// --- Attach to window for global use ---
window.startScenario = startScenario;
window.endScenario = endScenario;
window.processUserMessage = processUserMessage;
window.displayChatPair = displayChatPair;
window.handleUserInput = processUserMessage; // For phone.html
window.startScenarioLogic = startScenario; // For phone.html
window.handleMicInput = comboMic; // For phone.html
