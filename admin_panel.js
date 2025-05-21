// admin_panel.js

// ---- Utility for rendering each review entry ----
function renderReviewEntry(key, question, response, role) {
  const container = document.createElement('div');
  container.className = 'response';

  container.innerHTML = `
    <b>Q:</b> ${question}<br>
    <b>Role:</b>
      <select id="role-${key}">
        <option value="patient" ${role === "patient" ? "selected" : ""}>Patient</option>
        <option value="proctor" ${role === "proctor" ? "selected" : ""}>Proctor</option>
      </select>
    <br>
    <textarea id="resp-${key}" rows="2">${response}</textarea>
    <br>
    <button id="approve-btn-${key}">✅ Approve</button>
    <button onclick="deleteEntry('${key}')">🗑️ Delete</button>
  `;

  // Wire Approve button to approveEntry
  setTimeout(() => {
    document.getElementById(`approve-btn-${key}`)
      .onclick = () => approveEntry(key, question);
  }, 0);

  return container;
}

// ---- Core Approve Function with DEBUG LOGS ----
async function approveEntry(key, question) {
  console.log("DEBUG: approveEntry called", key, question);
  try {
    const response = document.getElementById(`resp-${key}`).value;
    const role = document.getElementById(`role-${key}`).value;
    console.log("DEBUG: Calling TTS fetch...", response, role);

    const res = await fetch('/.netlify/functions/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: response, speaker: role.toLowerCase() })
    });

    const json = await res.json();
    console.log("DEBUG: TTS fetch returned:", json);

    if (!res.ok || !json.audio) {
      alert("TTS audio generation failed: " + (json.error || "Unknown error."));
      return;
    }

    await db.ref('hardcodedResponses').push({
      question, response, role, ttsAudio: json.audio
    });
    await db.ref(`hardcodeReview/${key}`).remove();
    loadResponses();
    alert("Approved and TTS audio saved!");
  } catch (err) {
    alert("Approval failed: " + err.message);
  }
}

// ---- Save Function (if you use it for manual entries) ----
async function saveEntry(key) {
  console.log("DEBUG: saveEntry called", key);
  try {
    const response = document.getElementById(`resp-${key}`).value;
    const role = document.getElementById(`role-${key}`).value;
    console.log("DEBUG: Calling TTS fetch (save)...", response, role);

    const res = await fetch('/.netlify/functions/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: response, speaker: role.toLowerCase() })
    });

    const json = await res.json();
    console.log("DEBUG: TTS fetch (save) returned:", json);

    if (!res.ok || !json.audio) {
      alert("TTS audio generation failed: " + (json.error || "Unknown error."));
      return;
    }

    await db.ref('hardcodedResponses').push({
      question: "(manual entry)",
      response,
      role,
      ttsAudio: json.audio
    });
    await db.ref(`hardcodeReview/${key}`).remove();
    loadResponses();
    alert("Saved and TTS audio attached!");
  } catch (err) {
    alert("Save failed: " + err.message);
  }
}

// ---- Load and render review entries ----
function loadResponses() {
  const container = document.getElementById("responsesContainer");
  container.innerHTML = "<b>Loading...</b>";
  db.ref('hardcodeReview').once('value', snap => {
    container.innerHTML = "";
    snap.forEach(child => {
      const key = child.key;
      const val = child.val();
      container.appendChild(
        renderReviewEntry(key, val.question, val.response, val.role)
      );
    });
  });
}

// ---- (Optional) Delete Entry ----
function deleteEntry(key) {
  if (confirm("Are you sure you want to delete this entry?")) {
    db.ref(`hardcodeReview/${key}`).remove().then(loadResponses);
  }
}

// ---- Firebase Initialization ----
// Replace this config with your real Firebase config!
var firebaseConfig = {
  // Your config here
};
firebase.initializeApp(firebaseConfig);
var db = firebase.database();

window.onload = loadResponses;
