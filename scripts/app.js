import { startScenario, endScenario } from './scenario.js';
import { speakText } from './tts.js';
import { routeUserInput, loadHardcodedResponses } from './router.js';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAmpYL8Ywfxkw_h2aMvF2prjiI0m5LYM40",
  authDomain: "ems-code-sim.firebaseapp.com",
  databaseURL: "https://ems-code-sim-default-rtdb.firebaseio.com",
  projectId: "ems-code-sim",
  storageBucket: "ems-code-sim.appspot.com",
  messagingSenderId: "190498607578",
  appId: "1:190498607578:web:4cf6c8e999b027956070e3",
  measurementId: "G-2Q3ZT01YT1"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let scenarioPath = "";
let chatLog = [];
let patientImageShown = false;

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("startButton").addEventListener("click", async () => {
    console.log("✅ Start button clicked");
    try {
      await loadHardcodedResponses();
      startScenario();
      scenarioPath = await fetchScenarioPath();
      displayChatMessage("📟 Dispatch", "You are dispatched to a call...");
      patientImageShown = false;
    } catch (e) {
      console.error("Error in Start Scenario:", e);
    }
  });

  document.getElementById("endButton").addEventListener("click", async () => {
    console.log("🛑 End button clicked");
    endScenario();
    await saveChatLog();
    chatLog = [];
  });

  document.getElementById("sendButton").addEventListener("click", async () => {
    const inputBox = document.getElementById("userInput");
    const userMessage = inputBox.value.trim();
    if (userMessage) {
      inputBox.value = "";
      await processUserMessage(userMessage);
    }
  });

  document.getElementById("userInput").addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const userMessage = e.target.value.trim();
      if (userMessage) {
        e.target.value = "";
        await processUserMessage(userMessage);
      }
    }
  });
});

async function processUserMessage(message) {
  displayChatMessage("🧑 You", message);
  chatLog.push({ role: "user", content: message });

  const isProctor = isProctorQuestion(message);
  const context = {
    scenarioId: scenarioPath,
    role: isProctor ? "proctor" : "patient"
  };

  const { response, source } = await routeUserInput(message, context);

  const name = source.includes("proctor") ? "🧑‍⚕️ Proctor" : "🧍 Patient";
  displayChatMessage(name, response);
  chatLog.push({ role: "assistant", content: response });

  if (name === "🧍 Patient") speakText(response, "onyx");
  if (name === "🧑‍⚕️ Proctor") speakText(response, "shimmer");
}

function isProctorQuestion(text) {
  const keywords = ["blood pressure", "pulse", "respiratory", "scene safe", "BSI", "PPE", "MOI", "NOI"];
  return keywords.some((kw) => text.toLowerCase().includes(kw));
}

function displayChatMessage(name, text) {
  const chatBox = document.getElementById("chatBox");
  const msgDiv = document.createElement("div");
  msgDiv.innerHTML = `<strong>${name}:</strong> ${text}`;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function fetchScenarioPath() {
  const response = await fetch("/currentScenarioPath.txt");
  const path = await response.text();
  return path.trim();
}

async function saveChatLog() {
  const logRef = ref(database, "chatLogs/" + Date.now());
  await set(logRef, {
    scenario: scenarioPath,
    log: chatLog
  });
}
