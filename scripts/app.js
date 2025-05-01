let scenarioStarted = false;
let scenarioData = {};

async function speak(text, speaker = "patient") {
  console.log("[TTS] Speaking as:", speaker, "→", text);
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speaker })
    });

    const { audio } = await res.json();
    if (!audio) throw new Error("No audio returned from TTS");

    const audioBlob = new Blob([Uint8Array.from(atob(audio), c => c.charCodeAt(0))], {
      type: "audio/mpeg"
    });

    const audioUrl = URL.createObjectURL(audioBlob);
    const player = new Audio(audioUrl);
    player.play();
  } catch (err) {
    console.error("[TTS Error]", err);
  }
}

function displayMessage(text, role = "patient") {
  const chatDisplay = document.getElementById("chatDisplay");
  const msgDiv = document.createElement("div");

  msgDiv.className =
    role === "user"
      ? "user-bubble"
      : role === "proctor"
      ? "proctor-bubble"
      : "patient-bubble";

  msgDiv.textContent = role === "user" ? text : `${capitalize(role)}: ${text}`;
  chatDisplay.appendChild(msgDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;

  if (role === "patient" || role === "proctor") speak(text, role);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function handleUserInput() {
  const inputField = document.getElementById("userInput");
  const userText = inputField.value.trim();
  if (!userText) return;
  inputField.value = "";
  displayMessage("You: " + userText, "user");
  getAIResponse(userText);
}

async function getAIResponse(userText) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText, scenario: "chest_pain_002" })
    });

    const data = await res.json();
    const reply = data.reply || "I'm not sure how to respond to that.";
    const role = data.role || "patient";
    displayMessage(reply, role);
  } catch (err) {
    console.error("[GPT Error]", err);
    displayMessage("[Error] Could not get AI response.", "system");
  }
}

function startScenario() {
  if (scenarioStarted) return;
  scenarioStarted = true;

  displayMessage("🚑 Dispatch: You are dispatched to a 62-year-old male with chest pain at a park.", "dispatch");

  fetch("scenarios/chest_pain_002/patient.txt")
    .then((res) => res.text())
    .then((data) => {
      scenarioData.patientInfo = data;
      console.log("✅ Patient info loaded but not displayed.");
    });

  fetch("scenarios/chest_pain_002/dispatch.txt")
    .then((res) => res.text())
    .then((data) => {
      scenarioData.dispatchInfo = data;
    });
}

function endScenario() {
  scenarioStarted = false;
  displayMessage("Scenario ended. Please review your actions.", "system");
}

// Attach button and input listeners
document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start-button");
  const endBtn = document.getElementById("end-button");
  const sendBtn = document.getElementById("send-button");
  const inputField = document.getElementById("userInput");

  if (startBtn) startBtn.addEventListener("click", startScenario);
  if (endBtn) endBtn.addEventListener("click", endScenario);
  if (sendBtn) sendBtn.addEventListener("click", handleUserInput);
  if (inputField) {
    inputField.addEventListener("keypress", function (e) {
      if (e.key === "Enter") handleUserInput();
    });
  }
});
