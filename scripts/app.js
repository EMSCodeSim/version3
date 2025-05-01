// FULL RESTORED AND UPDATED app.js

let scenarioStarted = false;
let scenarioData = {};
let currentSpeaker = "patient";

// Bind start and end buttons
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("startButton").addEventListener("click", startScenario);
  document.getElementById("endButton").addEventListener("click", endScenario);
  document.getElementById("sendButton").addEventListener("click", handleUserInput);
  document.getElementById("userInput").addEventListener("keypress", function (e) {
    if (e.key === "Enter") handleUserInput();
  });
});

function startScenario() {
  if (scenarioStarted) return;
  scenarioStarted = true;
  displayMessage("Dispatch: You are dispatched to a 62-year-old male with a chief complaint of chest pain. The patient is located at a public park.", "dispatch");

  fetch("scenarios/chest_pain_002/patient.txt")
    .then(res => res.text())
    .then(data => {
      scenarioData.patientInfo = data;
      console.log("Patient data loaded:", data);
    });

  fetch("scenarios/chest_pain_002/dispatch.txt")
    .then(res => res.text())
    .then(data => {
      scenarioData.dispatchInfo = data;
    });
}

function endScenario() {
  scenarioStarted = false;
  displayMessage("Scenario ended. Please review your performance.", "system");
}

function handleUserInput() {
  const inputField = document.getElementById("userInput");
  const userText = inputField.value.trim();
  if (!userText) return;
  displayMessage("You: " + userText, "user");
  inputField.value = "";

  getAIResponse(userText);
}

function displayMessage(text, role = "patient") {
  const chatDisplay = document.getElementById("chatDisplay");
  const msgDiv = document.createElement("div");
  msgDiv.className = role === "user" ? "user-bubble" : role === "proctor" ? "proctor-bubble" : "patient-bubble";
  msgDiv.textContent = text;
  chatDisplay.appendChild(msgDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;

  if (role === "proctor" || role === "patient") speak(text, role);
}

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

    const audioBlob = new Blob([
      Uint8Array.from(atob(audio), c => c.charCodeAt(0))
    ], { type: "audio/mpeg" });

    const audioUrl = URL.createObjectURL(audioBlob);
    const player = new Audio(audioUrl);
    player.play();
  } catch (err) {
    console.error("[TTS Error]", err);
  }
}

async function getAIResponse(userText) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText, scenario: "chest_pain_002" })
    });

    const data = await res.json();
    const reply = data.reply || "I'm sorry, I don't have a response for that.";
    const role = data.role || "patient";

    displayMessage(reply, role);
  } catch (err) {
    console.error("[GPT Response Error]", err);
    displayMessage("[Error] Could not get AI response.", "system");
  }
}
