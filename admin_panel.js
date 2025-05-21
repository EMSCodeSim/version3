// admin_panel.js

// Example: Render each review entry as a card with Approve button
function renderReviewEntry(key, question, response, role) {
  const container = document.createElement('div');
  container.className = 'response';

  // Response textarea and role
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

  // Wire approve button
  setTimeout(() => {
    document.getElementById(`approve-btn-${key}`)
      .onclick = () => approveEntry(key, question);
  }, 0);

  return container;
}

// Main approveEntry with debug logs and error handling
async function approveEntry(key, question) {
  try {
    console.log("approveEntry called", key, question);
    const response = document.getElementById(`resp-${key}`).value;
    const role = document.getElementById(`role-${key}`).value;
    console.log("Calling TTS fetch...", response, role);

    const res = await fetch('/.netlify/functions/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: response, speaker: role.toLowerCase() })
    });

    const json = await res.json();
    console.log("TTS fetch returned:", json);

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

async function saveEntry(key) {
  try {
    const response = document.getElementById(`resp-${key}`).value;
    const role = document.getElementById(`role-${key}`).value;

    const res = await fetch('/.netlify/functions/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: response, speaker: role.toLowerCase() })
    });

    const json = await res.json();

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

// Example: Load responses and render review entries (simplified)
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

// Example: Initialize Firebase (should match your config)
var firebaseConfig = {
  // your firebase config here...
};
firebase.initializeApp(firebaseConfig);
var db = firebase.database();

window.onload = loadResponses;
