import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAmpYL8Ywfxkw_h2aMvF2prjiI0m5LYM40",
  authDomain: "ems-code-sim.firebaseapp.com",
  databaseURL: "https://ems-code-sim-default-rtdb.firebaseio.com",
  projectId: "ems-code-sim",
  storageBucket: "ems-code-sim.firebasestorage.app",
  messagingSenderId: "190498607578",
  appId: "1:190498607578:web:4cf6c8e999b027956070e3",
  measurementId: "G-2Q3ZT01YT1"
};

// Init
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM elements
const chatBox = document.getElementById("chat-box");
const inputField = document.getElementById("user-input");
const sendBtn = document.getElementById("send-button");
const startBtn = document.getElementById("start-button");

// Load hardcoded responses
let hardcodedResponses = [];

async function loadHardcodedResponses() {
  const snap = await get(ref(db, "hardcodedResponses"));
  const data = snap.val();
  if (data) {
    hardcodedResponses = Object.values(data);
  }
}
await loadHardcodedResponses();

// Start scenario
startBtn.addEventListener("click", () => {
  appendMessage("Proctor", "Scenario started. You may begin.");
});

// Handle sending message
sendBtn.addEventListener("click", async () => {
  const userMsg = inputField.value.trim();
  if (!userMsg) return;
  appendMessage("You", userMsg);
  inputField.value = "";

  const response = await getResponse(userMsg);
  if (response) {
    appendMessage(response.role + " (hardcoded)", response.response, response.ttsAudio);
  } else {
    appendMessage("Proctor", "No hardcoded match found.");
  }
});

// Append message with optional audio
function appendMessage(sender, text, ttsAudio) {
  const msg = document.createElement("div");
  msg.className = "message";
  msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatBox.appendChild(msg);

  if (ttsAudio) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = ttsAudio.startsWith("data:") ? ttsAudio : `data:audio/mp3;base64,${ttsAudio}`;
    chatBox.appendChild(audio);
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

// Look for exact match in Firebase
async function getResponse(userInput) {
  const normalized = userInput.trim().toLowerCase();

  for (let stored of hardcodedResponses) {
    const question = stored?.question?.trim().toLowerCase();
    console.log("Checking message:", normalized);
    console.log("Against stored question:", question);
    if (question === normalized) {
      return stored;
    }
  }

  return null;
}
