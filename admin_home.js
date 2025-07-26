let responsesData = [];
const skillSheetIDs = [
  "Scene Size-up", "Primary Survey/Resuscitation", "History Taking",
  "Secondary Assessment", "Reassessment", "Vital Signs",
  "OPQRST", "SAMPLE", "Field Impression", "Transport Decision"
];

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "emscode-sim.firebaseapp.com",
  databaseURL: "https://emscode-sim-default-rtdb.firebaseio.com",
  projectId: "emscode-sim",
};
const firebaseApp = firebase.initializeApp(firebaseConfig);
const db = firebaseApp.database();

const filePaths = [
  "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part1.json",
  "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part2.json",
  "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part3.json"
];

async function fetchAllFiles() {
  let all = [];
  for (const path of filePaths) {
    try {
      const res = await fetch(path);
      const json = await res.json();
      all = all.concat(json);
    } catch (err) {
      log(`Failed to load ${path}: ${err.message}`);
    }
  }
  responsesData = deduplicate(all);
  renderResponses();
}

async function fetchFirebaseResponses() {
  try {
    const snapshot = await db.ref("/hardcodedResponses").once("value");
    const firebaseData = snapshot.val() || {};
    const firebaseArray = Object.values(firebaseData);
    responsesData = deduplicate(responsesData.concat(firebaseArray));
    log(`Loaded ${firebaseArray.length} Firebase entries. Total: ${responsesData.length}`);
    renderResponses();
  } catch (err) {
    log("Firebase load failed: " + err.message);
  }
}

function deduplicate(dataArray) {
  const seen = new Set();
  const deduped = [];

  for (const entry of dataArray) {
    const key = `${entry.question?.toLowerCase().trim()}|${entry.answer?.toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(entry);
    }
  }
  log(`Deduplicated to ${deduped.length} entries.`);
  return deduped;
}

function removeDuplicates() {
  responsesData = deduplicate(responsesData);
  renderResponses();
}

function renderResponses() {
  const container = document.getElementById("responsesContainer");
  container.innerHTML = "";

  responsesData.forEach((entry, index) => {
    const card = document.createElement("div");
    card.className = "response";

    card.innerHTML = `
      <div class="row">
        <div class="field">
          <label>Question</label>
          <input type="text" value="${entry.question || ""}" data-key="question" data-index="${index}" />
        </div>
        <div class="field">
          <label>Answer</label>
          <textarea data-key="answer" data-index="${index}">${entry.answer || ""}</textarea>
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>Tags (comma-separated)</label>
          <input type="text" value="${entry.tags?.join(", ") || ""}" data-key="tags" data-index="${index}" />
        </div>
        <div class="field">
          <label>Role</label>
          <input type="text" value="${entry.role || "patient"}" data-key="role" data-index="${index}" />
        </div>
        <div class="field">
          <label>Skill Sheet ID</label>
          <select data-key="scoreCategory" data-index="${index}">
            <option value="">-- Select --</option>
            ${skillSheetIDs.map(id => `<option value="${id}" ${entry.scoreCategory === id ? "selected" : ""}>${id}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="row">
        <button class="btn" onclick="generateTTS(${index})">🔊 Generate Voice</button>
        <button class="btn" onclick="deleteEntry(${index})">❌ Delete</button>
      </div>
      <audio id="audio-${index}" controls style="margin-top:6px;"></audio>
    `;

    container.appendChild(card);
  });

  bindInputListeners();
}

function bindInputListeners() {
  document.querySelectorAll("#responsesContainer input, #responsesContainer textarea, #responsesContainer select").forEach((el) => {
    el.addEventListener("input", () => {
      const key = el.dataset.key;
      const index = parseInt(el.dataset.index);
      if (key === "tags") {
        responsesData[index][key] = el.value.split(",").map(t => t.trim());
      } else {
        responsesData[index][key] = el.value;
      }
    });
  });
}

function deleteEntry(index) {
  responsesData.splice(index, 1);
  renderResponses();
  log("Entry deleted.");
}

async function generateTTS(index) {
  const text = responsesData[index].answer;
  const voice = responsesData[index].role === "proctor" ? "shimmer" : "onyx";
  const url = "https://api.openai.com/v1/audio/speech";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: "tts-1", voice, input: text })
    });

    const blob = await response.blob();
    const audio = document.getElementById(`audio-${index}`);
    audio.src = URL.createObjectURL(blob);
    log("Voice generated.");
  } catch (err) {
    log("TTS error: " + err.message);
  }
}

function log(message) {
  document.getElementById("logBox").textContent = message;
}

document.addEventListener("DOMContentLoaded", async () => {
  await fetchAllFiles();
  await fetchFirebaseResponses();
});
