// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const responsesRef = ref(db, 'hardcodedResponses');

// Get container
const container = document.getElementById("responsesContainer");

// Load and render responses
onValue(responsesRef, (snapshot) => {
  const data = snapshot.val();
  container.innerHTML = '';

  if (!data) {
    container.innerHTML = '<p>No responses found.</p>';
    return;
  }

  Object.entries(data).forEach(([key, entry]) => {
    const div = document.createElement('div');
    div.className = 'response-block';
    div.innerHTML = `
      <p><strong>Q:</strong> ${entry.question || 'N/A'}</p>
      <textarea id="response-${key}">${entry.response || ''}</textarea>
      <select id="role-${key}">
        <option value="Patient" ${entry.role === 'Patient' ? 'selected' : ''}>Patient</option>
        <option value="Proctor" ${entry.role === 'Proctor' ? 'selected' : ''}>Proctor</option>
      </select>
      <button class="save-btn" onclick="saveEntry('${key}')">💾 Save</button>
      <button class="delete-btn" onclick="deleteEntry('${key}')">🗑️ Delete</button>
    `;
    container.appendChild(div);
  });
});

// Save entry and generate TTS audio
window.saveEntry = async function(key) {
  const textEl   = document.getElementById(`response-${key}`);
  const roleEl   = document.getElementById(`role-${key}`);
  const text     = textEl.value.trim();
  const speaker  = roleEl.value;

  if (!text) {
    alert("Response text can’t be empty.");
    return;
  }

  try {
    const ttsRes = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speaker: speaker.toLowerCase() })
    });

    const ttsJson = await ttsRes.json();
    if (!ttsRes.ok) {
      console.error("TTS error details:", ttsJson.details || ttsJson.error);
      throw new Error(ttsJson.error || "TTS API error");
    }

    const base64Audio = ttsJson.audio;
    if (!base64Audio) {
      throw new Error("No audio returned from TTS.");
    }

    const updates = {};
    updates[`hardcodedResponses/${key}/response`] = text;
    updates[`hardcodedResponses/${key}/role`]     = speaker;
    updates[`hardcodedResponses/${key}/ttsAudio`] = base64Audio;

    await update(ref(db), updates);
    alert("Saved and TTS audio generated!");

  } catch (err) {
    console.error("SaveEntry failed:", err);
    alert("Save failed: " + err.message);
  }
};

// Delete entry from Firebase
window.deleteEntry = async function(key) {
  if (!confirm("Delete this response?")) return;

  const updates = {};
  updates[`hardcodedResponses/${key}`] = null;
  await update(ref(db), updates);
  alert("Entry deleted.");
};
