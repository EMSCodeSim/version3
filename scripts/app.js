// app.js

import { loadHardcodedResponses, routeUserInput } from './router.js';
import { initializeScoreTracker, gradeActionBySkillID } from './grading.js';
import { comboMic } from './mic.js';

if (!window.scoreTracker) window.scoreTracker = {};

const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let gradingTemplate = {};
window.scenarioStarted = false;

// Display chat: user bubble shows instantly, TTS audio (if present) plays, THEN text appears
function displayChatPair(userMsg, replyMsg, replyRole, ttsAudio, trigger) {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return;

  // Keep scenario image if present
  let scenarioImg = null;
  if (chatBox.firstChild && chatBox.firstChild.tagName === "IMG" && chatBox.firstChild.src.includes("scene1.PNG")) {
    scenarioImg = chatBox.firstChild.cloneNode(true);
  }
  chatBox.innerHTML = "";
  if (scenarioImg) chatBox.appendChild(scenarioImg);

  // TRIGGER IMAGE/AUDIO (if present and not scenario image)
  if (trigger && typeof trigger === "string" && trigger.trim() !== "") {
    const triggerLower = trigger.toLowerCase();
    if (!triggerLower.includes("scene1.png")) {
      if (triggerLower.match(/\.(jpe?g|png|gif|webp)$/)) {
        const img = document.createElement('img');
        img.src = `${scenarioPath}${trigger}`;
        img.alt = "Response Image";
        img.style.maxWidth = "100%";
        img.style.borderRadius = "10px";
        img.style.marginBottom = "14px";
        img.onerror = function() {
          this.style.display = "none";
          const warn = document.createElement('div');
          warn.textContent = "Image not found: " + img.src;
          warn.style.color = "red";
          chatBox.insertBefore(warn, chatBox.children[scenarioImg ? 1 : 0] || null);
        };
        chatBox.appendChild(img);
      }
      if (triggerLower.match(/\.(mp3|wav|m4a|ogg)$/)) {
        const audio = document.createElement('audio');
        audio.src = `${scenarioPath}${trigger}`;
        audio.controls = true;
        audio.style.display = "block";
        audio.style.margin = "10px 0 14px 0";
        chatBox.appendChild(audio);
      }
    }
  }

  // USER bubble (always show immediately)
  if (userMsg && userMsg.trim()) {
    const userDiv = document.createElement('div');
    userDiv.className = "chat-bubble user-bubble";
    userDiv.innerHTML = `<b>You:</b> ${userMsg}`;
    chatBox.appendChild(userDiv);
  }

  // RESPONSE bubble: play audio first, then show text
  function showReplyBubble() {
    if (replyMsg && replyMsg.trim()) {
      let bubbleClass = "chat-bubble system-bubble";
      let label = "";
      if (replyRole === "patient") {
        bubbleClass = "chat-bubble patient-bubble";
        label = "Patient";
      } else if (replyRole === "proctor") {
        bubbleClass = "chat-bubble proctor-bubble";
        label = "Proctor";
      } else if (replyRole === "dispatch") {
        bubbleClass = "chat-bubble dispatch-bubble";
        label = "Dispatch";
      } else if (replyRole === "system") {
        bubbleClass = "chat-bubble system-bubble";
        label = "System";
      }
      const replyDiv = document.createElement('div');
      replyDiv.className = bubbleClass;
      replyDiv.innerHTML = label ? `<b>${label}:</b> ${replyMsg}` : replyMsg;
      chatBox.appendChild(replyDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }

  // --- Play TTS audio before showing text ---
  if (ttsAudio) {
    // Remove any existing TTS audio
    document.querySelectorAll("audio#scenarioTTS").forEach(audio => {
      try { audio.pause(); } catch (e) {}
      audio.remove();
    });

    const audioElement = document.createElement("audio");
    audioElement.id = "scenarioTTS";
    audioElement.src = ttsAudio;
    audioElement.autoplay = true;
    audioElement.style.display = "none";
    chatBox.appendChild(audioElement);

    // When audio ends, display the text
    audioElement.onended = () => {
      showReplyBubble();
      audioElement.remove(); // Clean up
    };
    audioElement.onerror = () => {
      showReplyBubble();
      audioElement.remove();
    };

    // Play immediately in case autoplay works
    audioElement.play().catch(() => {
      // If browser blocks, show text after a brief pause
      setTimeout(showReplyBubble, 500);
    });
  } else {
    // No audio, show text immediately
    showReplyBubble();
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

// --- Play audio utility (kept for backward compatibility) ---
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

// Speak text using browser speech synthesis (not used in normal TTS flow)
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

// Error logging (console only)
function logErrorToDatabase(errorInfo) {
  console.error("🔴", errorInfo);
}

// --- MAIN: Start Scenario ---
async function startScenario() {
  if (window.scenarioStarted) return;
  const spinner = document.getElementById('loading-spinner');
  try {
    if (spinner) spinner.style.display = "block";
    await loadHardcodedResponses();

    const configRes = await fetch(`${scenarioPath}config.json`);
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

    const dispatchRes = await fetch(`${scenarioPath}dispatch.txt`);
    if (!dispatchRes.ok) throw new Error("Missing dispatch.txt");
    const dispatch = await dispatchRes.text();

    const patientRes = await fetch(`${scenarioPath}patient.txt`);
    if (!patientRes.ok) throw new Error("Missing patient.txt");
    patientContext = await patientRes.text();

    if (window.resetSkillChecklistUI) window.resetSkillChecklistUI();

    // --- Show scenario image (scene1.PNG) at the top ---
    const chatBox = document.getElementById('chat-box');
    if (chatBox) {
      chatBox.innerHTML = ""; // clear previous content
      const img = document.createElement("img");
      img.src = `${scenarioPath}scene1.PNG`;
      img.alt = "Scene Image";
      img.style.maxWidth = "100%";
      img.style.borderRadius = "10px";
      img.style.marginBottom = "14px";
      chatBox.appendChild(img);
    }

    // Show dispatch info as the next bubble (system response only)
    displayChatPair("", `🚑 ${dispatch}`, "dispatch");
    speakOnce(dispatch, "", 1.0);

    window.scenarioStarted = true;
  } catch (err) {
    console.error("startScenario ERROR:", err);
    displayChatPair("", "❌ Failed to load scenario: " + err.message, "system");
    window.scenarioStarted = false;
  } finally {
    if (typeof window.hideLoadingSpinner === "function") window.hideLoadingSpinner();
  }
}

// --- End Scenario handler ---
function endScenario() {
  window.scenarioStarted = false;
  const chatBox = document.getElementById('chat-box');
  if (chatBox) chatBox.innerHTML += `<div class="chat-bubble system-bubble">Scenario ended.</div>`;
  // Optionally reset skill checklist, grading, etc.
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
    const { response, source, matchedEntry } = await routeUserInput(message, {
      scenarioId: scenarioPath,
      role: "user"
    });

    let replyRole = "patient";
    if (matchedEntry && matchedEntry.role) {
      if (matchedEntry.role.toLowerCase().includes("proctor")) replyRole = "proctor";
      else if (matchedEntry.role.toLowerCase().includes("patient")) replyRole = "patient";
    } else if (source && source.toLowerCase().includes("proctor")) {
      replyRole = "proctor";
    }

    // Play TTS audio (if present) BEFORE showing response text
    displayChatPair(
      message,
      response,
      replyRole,
      matchedEntry && matchedEntry.ttsAudio ? matchedEntry.ttsAudio : null,
      matchedEntry && matchedEntry.trigger
    );

    // === Use Skill Sheet ID for Grading ===
    if (matchedEntry && (matchedEntry.skillSheetID || matchedEntry["Skill Sheet ID"])) {
      let skillKey = matchedEntry.skillSheetID || matchedEntry["Skill Sheet ID"];
      gradeActionBySkillID(skillKey);
      if (window.updateSkillChecklistUI) window.updateSkillChecklistUI();
    }

  } catch (err) {
    displayChatPair(message, `❌ AI processing error: ${err.message}`, "system");
  }
}

// Attach event listeners for Send button and Enter key
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('send-button');
  const input = document.getElementById('user-input');
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

  // Mic button: Use combo mic (browser STT or Whisper fallback)
  const micBtn = document.getElementById('mic-button');
  if (micBtn) {
    micBtn.onclick = comboMic;
  }
});

// --- Attach to window for ES module compatibility ---
window.startScenario = startScenario;
window.endScenario = endScenario;
window.processUserMessage = processUserMessage;
window.displayChatPair = displayChatPair;
