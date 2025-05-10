const firebaseConfig = {
  databaseURL: "https://ems-code-sim-default-rtdb.firebaseio.com"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const container = document.getElementById("responsesContainer");

let currentTab = 'approved';

function switchTab(tab) {
  currentTab = tab;
  document.getElementById("tab-approved").classList.toggle("active", tab === 'approved');
  document.getElementById("tab-review").classList.toggle("active", tab === 'review');
  loadResponses();
}

function loadResponses() {
  const path = currentTab === 'review' ? 'hardcodeReview' : 'hardcodedResponses';
  db.ref(path).once('value')
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
          ${currentTab === 'review' 
            ? `<button onclick="approveEntry('${key}', \`${question.replace(/`/g, '\\`')}\`)">✅ Approve</button>` 
            : `<button onclick="saveEntry('${key}')">💾 Save</button>
               <button onclick="deleteEntry('${key}')">🗑️ Delete</button>`}
          ${ttsAudio ? `<br><audio controls src="data:audio/mp3;base64,${ttsAudio}"></audio>` : ''}
        `;
        container.appendChild(div);
      });
    });
}

window.saveEntry = async function(key) {
  const text = document.getElementById(`response-${key}`).value.trim();
  const role = document.getElementById(`role-${key}`).value;

  if (!text) return alert("Response text is required.");

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
    alert("Saved.");
    loadResponses();
  } catch (err) {
    alert("Save failed: " + err.message);
  }
};

window.deleteEntry = async function(key) {
  if (!confirm("Delete this entry?")) return;
  await db.ref(`hardcodedResponses/${key}`).remove();
  alert("Deleted.");
  loadResponses();
};

window.approveEntry = async function(key, question) {
  const text = document.getElementById(`response-${key}`).value.trim();
  const role = document.getElementById(`role-${key}`).value;

  if (!text) return alert("Response text is required.");

  try {
    const res = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speaker: role.toLowerCase() })
    });
    const json = await res.json();
    if (!res.ok || !json.audio) throw new Error(json.error || "TTS failed");

    await db.ref(`hardcodedResponses/${key}`).set({
      question: question,
      response: text,
      role: role,
      ttsAudio: json.audio
    });
    await db.ref(`hardcodeReview/${key}`).remove();
    alert("Approved and moved.");
    loadResponses();
  } catch (err) {
    alert("Approval failed: " + err.message);
  }
};

window.upgradeMissingTTS = async function() {
  const snapshot = await db.ref('hardcodedResponses').once('value');
  const data = snapshot.val();
  if (!data) return alert("No data found.");

  const entries = Object.entries(data).filter(([_, v]) => v.response && !v.ttsAudio);
  if (!entries.length) return alert("All entries already have TTS.");

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
      }
    } catch (err) {
      console.error(`TTS upgrade failed for ${key}:`, err);
    }
  }

  alert("TTS upgrades complete.");
  loadResponses();
};

loadResponses();
