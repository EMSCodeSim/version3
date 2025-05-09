const firebaseConfig = {
  databaseURL: "https://ems-code-sim-default-rtdb.firebaseio.com"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const container = document.getElementById("responsesContainer");

function loadResponses() {
  db.ref('hardcodedResponses').once('value')
    .then(snapshot => {
      container.innerHTML = '';
      if (!snapshot.exists()) {
        container.innerHTML = '<div>No responses found.</div>';
        return;
      }

      snapshot.forEach(child => {
        const key = child.key;
        const entry = child.val();

        const question = entry.userQuestion || entry.question || 'N/A';
        const response = entry.aiResponse || entry.response || '';

        const role = entry.role || 'Patient';
        const ttsAudio = entry.ttsAudio || null;

        const div = document.createElement('div');
        div.className = 'response';
        div.innerHTML = `
          <p><strong>Q:</strong> ${question}</p>
          <textarea id="response-${key}">${response}</textarea><br>
          <select id="role-${key}">
            <option value="Patient" ${role === 'Patient' ? 'selected' : ''}>Patient</option>
            <option value="Proctor" ${role === 'Proctor' ? 'selected' : ''}>Proctor</option>
          </select>
          <button onclick="saveEntry('${key}')">💾 Save</button>
          <button onclick="deleteEntry('${key}')">🗑️ Delete</button>
          ${ttsAudio ? `<br><audio controls src="data:audio/mp3;base64,${ttsAudio}"></audio>` : ''}
        `;
        container.appendChild(div);
      });
    })
    .catch(err => {
      console.error("Firebase load error:", err);
      container.innerHTML = '<div>Error loading responses.</div>';
    });
}

window.saveEntry = async function(key) {
  const text = document.getElementById(`response-${key}`).value.trim();
  const role = document.getElementById(`role-${key}`).value;

  if (!text) return alert("Response cannot be empty.");

  try {
    const res = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speaker: role.toLowerCase() })
    });

    const json = await res.json();
    if (!res.ok || !json.audio) throw new Error(json.error || "TTS failed");

    await db.ref(`hardcodedResponses/${key}`).update({
      response: text,
      role: role,
      ttsAudio: json.audio
    });

    alert("Saved and TTS updated.");
    loadResponses();
  } catch (err) {
    console.error("Save error:", err);
    alert("Save failed: " + err.message);
  }
};

window.deleteEntry = async function(key) {
  if (!confirm("Delete this response?")) return;
  await db.ref(`hardcodedResponses/${key}`).remove();
  alert("Deleted.");
  loadResponses();
};

window.upgradeMissingTTS = async function() {
  const snapshot = await db.ref('hardcodedResponses').once('value');
  const data = snapshot.val();
  if (!data) return alert("No responses found.");

  const entries = Object.entries(data).filter(([_, v]) => v.response && !v.ttsAudio);
  if (!entries.length) return alert("All entries have TTS already.");

  if (!confirm(`Upgrade ${entries.length} entries?`)) return;

  for (const [key, entry] of entries) {
    try {
      const res = await fetch("/.netlify/functions/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: entry.response, speaker: (entry.role || "Patient").toLowerCase() })
      });

      const json = await res.json();
      if (res.ok && json.audio) {
        await db.ref(`hardcodedResponses/${key}/ttsAudio`).set(json.audio);
        console.log(`✅ Upgraded: ${key}`);
      } else {
        console.warn(`❌ Failed for ${key}:`, json.error);
      }
    } catch (err) {
      console.error(`❌ Error upgrading ${key}:`, err);
    }
  }

  alert("Upgrade complete.");
  loadResponses();
};

loadResponses();
