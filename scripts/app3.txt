// Inserted near the top
const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let hardcodedResponses = {};
let gradingTemplate = {};
let scoreTracker = {};
let micActive = false;
let recognition;

// Initialize mic recognition
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

// Turn mic on
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

// Turn mic off
function stopMic() {
  if (recognition && micActive) {
    recognition.stop();
    micActive = false;
    document.getElementById("mic-button").classList.remove("active");
  }
}

// Pause mic (during TTS), then resume
function pauseMicDuringTTS(durationMs) {
  stopMic();
  setTimeout(() => {
    startMic();
  }, durationMs + 200); // resume after TTS ends
}

// Load hardcoded responses
firebase.database().ref('hardcodedResponses').once('value').then(snapshot => {
  hardcodedResponses = snapshot.val() || {};
});

// Speak function with mic pause
async function speak(text, speaker = "patient", audioUrl = null) {
  try {
    stopMic(); // pause mic before speaking

    if (audioUrl) {
      const player = new Audio(audioUrl);
      player.onended = () => startMic(); // resume mic
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
    player.onended = () => startMic();
    player.play();
  } catch (err) {
    console.error("TTS error:", err);
    startMic();
  }
}

// Display chat message
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

// Scenario start: load config and activate mic
window.startScenario = async function () {
  try {
    const configRes = await fetch(`${scenarioPath}config.json`);
    const config = await configRes.json();
    const gradingType = config.grading || "medical";

    await loadGradingTemplate(gradingType);

    const dispatch = await loadDispatchInfo();
    patientContext = await loadPatientInfo();

    displayChatResponse(`🚑 Dispatch: ${dispatch}`);
    startMic(); // mic starts when scenario starts
  } catch (err) {
    logErrorToDatabase("startScenario error: " + err.message);
    displayChatResponse("❌ Scenario failed to load.");
  }
};

// End scenario and stop mic
window.endScenario = function () {
  stopMic();
  const feedback = gradeScenario();
  displayChatResponse(feedback);
};

// Manual mic toggle (optional)
window.startVoiceRecognition = function () {
  if (micActive) stopMic();
  else startMic();
};

// DOM bindings
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
