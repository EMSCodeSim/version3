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
        ${ttsAudio ? `<br><audio controls src="data:audio/mp3;base64,${ttsAudio}"></audio>` : ""}
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
  const response = document.getElementById(`resp-${id}`).value;
  const role = document.getElementById(`role-${id}`).value;

  const tts = await fetch("/.netlify/functions/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: response, speaker: role.toLowerCase() })
  });
  const { audio } = await tts.json();

  await db.ref("hardcodedResponses").push({
    question,
    response,
    role,
    ttsAudio: audio || ""
  });
  await ref.remove();
  loadResponses();
};

window.saveApproved = async function(id) {
  const response = document.getElementById(`resp-${id}`).value;
  const role = document.getElementById(`role-${id}`).value;

  const tts = await fetch("/.netlify/functions/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: response, speaker: role.toLowerCase() })
  });
  const { audio } = await tts.json();

  await db.ref("hardcodedResponses").child(id).update({
    response,
    role,
    ttsAudio: audio || ""
  });

  alert("✅ Saved");
  loadResponses();
};

window.deleteReview = function(id) {
  db.ref("hardcodeReview").child(id).remove().then(loadResponses);
};

window.deleteApproved = function(id) {
  db.ref("hardcodedResponses").child(id).remove().then(loadResponses);
};

// Auto-load approved tab
switchTab("approved");
