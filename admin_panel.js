const db = firebase.database();
const container = document.getElementById("responsesContainer");

let currentTab = "approved";

function switchTab(tab) {
  currentTab = tab;
  document.getElementById("tab-approved").classList.toggle("active", tab === "approved");
  document.getElementById("tab-review").classList.toggle("active", tab === "review");
  loadResponses();
}

function loadResponses() {
  const ref = db.ref(currentTab === "review" ? "hardcodeReview" : "hardcodedResponses");
  ref.once("value").then(snapshot => {
    container.innerHTML = "";

    if (!snapshot.exists()) {
      container.innerHTML = "<p>No responses found.</p>";
      return;
    }

    snapshot.forEach(child => {
      const id = child.key;
      const entry = child.val();

      const question = entry.userQuestion || entry.question || "N/A";
      const response = entry.response || entry.aiResponse || "";
      const role = entry.role || "Patient";
      const ttsAudio = entry.ttsAudio || "";

      const div = document.createElement("div");
      div.className = "response-block";

      div.innerHTML = `
        <p><strong>Q:</strong> ${question}</p>
        <textarea id="resp-${id}">${response}</textarea><br>
        <select id="role-${id}">
          <option value="Patient" ${role === "Patient" ? "selected" : ""}>Patient</option>
          <option value="Proctor" ${role === "Proctor" ? "selected" : ""}>Proctor</option>
        </select>
        ${ttsAudio
          ? `<br><button onclick="playTTS('${ttsAudio}')">▶ Play TTS</button>
             <audio id="audio-${id}" src="data:audio/mp3;base64,${ttsAudio}"></audio>`
          : ""}
        ${currentTab === "review"
          ? `<button onclick="approveResponse('${id}')">✅ Approve</button>
             <button onclick="deleteReview('${id}')">🗑 Delete</button>`
          : `<button onclick="saveApproved('${id}')">💾 Save</button>
             <button onclick="deleteApproved('${id}')">🗑 Delete</button>`}
      `;

      container.appendChild(div);
    });
  });
}

window.approveResponse = async function(id) {
  const ref = db.ref("hardcodeReview").child(id);
  const snap = await ref.once("value");
  const data = snap.val();
  const question = data.userQuestion || data.question || id;
  const response = document.getElementById(`resp-${id}`).value.trim();
  const role = document.getElementById(`role-${id}`).value;

  try {
    const ttsRes = await fetch("/.netlify/functions/tts.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: response, speaker: role.toLowerCase() })
    });
    const { audio } = await ttsRes.json();

    await db.ref("hardcodedResponses").push({
      question,
      response,
      role,
      ttsAudio: audio || ""
    });

    await ref.remove();
    alert("✅ Approved and TTS saved.");
    loadResponses();
  } catch (err) {
    console.error("TTS Error:", err);
    alert("Failed to approve with TTS.");
  }
};

window.saveApproved = async function(id) {
  const response = document.getElementById(`resp-${id}`).value.trim();
  const role = document.getElementById(`role-${id}`).value;

  try {
    const ttsRes = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: response, speaker: role.toLowerCase() })
    });
    const { audio } = await ttsRes.json();

    await db.ref("hardcodedResponses").child(id).update({
      response,
      role,
      ttsAudio: audio || ""
    });

    alert("💾 Saved and TTS updated.");
    loadResponses();
  } catch (err) {
    console.error("TTS Error:", err);
    alert("Failed to save with TTS.");
  }
};

window.deleteReview = function(id) {
  db.ref("hardcodeReview").child(id).remove().then(loadResponses);
};

window.deleteApproved = function(id) {
  db.ref("hardcodedResponses").child(id).remove().then(loadResponses);
};

window.playTTS = function(base64) {
  const audio = new Audio(`data:audio/mp3;base64,${base64}`);
  audio.play().catch(err => {
    console.warn("Playback failed:", err);
    alert("Could not play audio.");
  });
};

// Load approved tab by default
switchTab("approved");
