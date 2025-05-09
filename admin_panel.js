import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

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

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const responsesRef = ref(db, 'hardcodedResponses');

// Load and render responses
const container = document.getElementById("responsesContainer");

onValue(responsesRef, (snapshot) => {
  const data = snapshot.val();
  container.innerHTML = '';

  if (!data) {
    container.innerHTML = '<p>No responses found.</p>';
    return;
  }

  Object.entries(data).forEach(([key, entry]) => {
    const question = entry.question || 'N/A';
    const response = entry.response !== undefined ? entry.response : '';
    const role = entry.role || 'Patient';
    const ttsAudio = entry.ttsAudio || null;

    const div = document.createElement('div');
    div.className = 'response-block';
    div.innerHTML = `
      <p><strong>Q:</strong> ${question}</p>
      <textarea id="response-${key}">${response}</textarea>
      <select id="role-${key}">
        <option value="Patient" ${role === 'Patient' ? 'selected' : ''}>Patient</option>
        <option value="Proctor" ${role === 'Proctor' ? 'selected' : ''}>Proctor</option>
      </select>
      <button class="save-btn" onclick="saveEntry('${key}')">💾 Save</button>
      <button class="delete-btn" onclick="deleteEntry('${key}')">🗑️ Delete</button>
      ${ttsAudio ? `<audio controls src="data:audio/mp3;base64,${ttsAudio}"></audio>` : ''}
    `;
    container.appendChild(div);
  });
});

// Save response and generate TTS
window.saveEntry = async function(key) {
  const textEl = document.getElementById(`response-${key}`);
  const roleEl = document.getElementById(`role-${key}`);
  const text = textEl.value.trim();
  const speaker = roleEl.value;

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
    if (!ttsRes.ok || !ttsJson.audio) {
      console.error("TTS error:", ttsJson.details || ttsJson.error);
      throw new Error(ttsJson.error || "TTS API error");
    }

    const updates = {
      [`hardcodedResponses/${key}/response`]: text,
      [`hardcodedResponses/${key}/role`]: speaker,
      [`hardcodedResponses/${key}/ttsAudio`]: ttsJson.audio
    };

    await update(ref(db), updates);
    alert("Saved and TTS audio generated!");
  } catch (err) {
    console.error("SaveEntry failed:", err);
    alert("Save failed: " + err.message);
  }
};

// Delete entry
window.deleteEntry = async function(key) {
  if (!confirm("Delete this response?")) return;
  const updates = {};
  updates[`hardcodedResponses/${key}`] = null;
  await update(ref(db), updates);
  alert("Entry deleted.");
};

// 🔄 Upgrade all missing TTS entries
window.upgradeMissingTTS = async function() {
  const snapshot = await get(ref(db, 'hardcodedResponses'));
  const data = snapshot.val();
  if (!data) {
    alert("No responses found.");
    return;
  }

  const entriesToUpgrade = Object.entries(data).filter(
    ([_, entry]) => entry.response && !entry.ttsAudio
  );

  if (entriesToUpgrade.length === 0) {
    alert("All entries already have TTS audio.");
    return;
  }

  const confirmUpgrade = confirm(`Upgrade ${entriesToUpgrade.length} entries missing TTS audio?`);
  if (!confirmUpgrade) return;

  for (const [key, entry] of entriesToUpgrade) {
    const text = entry.response.trim();
    const speaker = (entry.role || "Patient").toLowerCase();

    try {
      const ttsRes = await fetch("/.netlify/functions/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, speaker })
      });

      const ttsJson = await ttsRes.json();
      if (!ttsRes.ok || !ttsJson.audio) {
        console.warn(`Failed TTS for ${key}:`, ttsJson);
        continue;
      }

      const updates = {};
      updates[`hardcodedResponses/${key}/ttsAudio`] = ttsJson.audio;
      await update(ref(db), updates);
      console.log(`✅ Upgraded: ${key}`);
    } catch (err) {
      console.error(`❌ Error upgrading ${key}:`, err);
    }
  }

  alert("Upgrade complete. Refresh the page to see updated audio.");
};
