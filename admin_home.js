// admin_home.js with Firebase and local support

let responsesData = [];
let firebaseResponses = [];
let audioContext;

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

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
  fetchFirebaseLogs(); // ⬅ Also load Firebase entries
}

async function fetchFirebaseLogs() {
  try {
    const snapshot = await db.ref("gpt4turbo_logs/chest_pain_002").once("value");
    firebaseResponses = Object.entries(snapshot.val() || {}).map(([key, val]) => ({
      ...val,
      firebaseKey: key
    }));
    log(`Loaded ${firebaseResponses.length} Firebase responses`);
    renderFirebaseResponses();
  } catch (err) {
    log("Firebase error: " + err.message);
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
  return deduped;
}

function renderResponses() {
  const container = document.getElementById("responsesContainer");
  container.innerHTML = "";
  responsesData.forEach((entry, index) => {
    container.appendChild(createResponseCard(entry, index, "json"));
  });
}

function renderFirebaseResponses() {
  const container = document.getElementById("firebaseContainer");
  container.innerHTML = "";
  firebaseResponses.forEach((entry, index) => {
    container.appendChild(createResponseCard(entry, index, "firebase"));
  });
}

function createResponseCard(entry, index, source) {
  const card = document.createElement("div");
  card.className = "response";

  const skillSheetOptions = `
    <option value="">-- Select --</option>
    <option value="scene_size_up">Scene Size-Up</option>
    <option value="primary_survey">Primary Survey</option>
    <option value="history_taking">History Taking</option>
    <option value="secondary_assessment">Secondary Assessment</option>
    <option value="vital_signs">Vital Signs</option>
    <option value="reassessment">Reassessment</option>
    <option value="treatment">Treatment</option>
    <option value="transport_decision">Transport Decision</option>
  `;

  card.innerHTML = `
    <div class="row">
      <div class="field">
        <label>Question</label>
        <input type="text" value="${entry.question || ""}" data-key="question" data-index="${index}" data-source="${source}" />
      </div>
      <div class="field">
        <label>Answer</label>
        <textarea data-key="answer" data-index="${index}" data-source="${source}">${entry.answer || ""}</textarea>
      </div>
    </div>
    <div class="row">
      <div class="field">
        <label>Tags</label>
        <input type="text" value="${entry.tags?.join(", ") || ""}" data-key="tags" data-index="${index}" data-source="${source}" />
      </div>
      <div class="field">
        <label>Role</label>
        <input type="text" value="${entry.role || "patient"}" data-key="role" data-index="${index}" data-source="${source}" />
      </div>
      <div class="field">
        <label>Score Category</label>
        <select data-key="scoreCategory" data-index="${index}" data-source="${source}">
          ${skillSheetOptions.replace(`value="${entry.scoreCategory}"`, `value="${entry.scoreCategory}" selected`)}
        </select>
      </div>
    </div>
    <div class="row">
      <button class="btn" onclick="generateTTS(${index}, '${source}')">🔊 Voice</button>
      <button class="btn" onclick="deleteEntry(${index}, '${source}')">❌ Delete</button>
    </div>
    <audio id="audio-${source}-${index}" controls style="margin-top:6px;"></audio>
  `;

  return card;
}

function bindInputListeners() {
  document.querySelectorAll("input, textarea, select").forEach((el) => {
    el.addEventListener("input", (e) => {
      const { key, index, source } = el.dataset;
      const list = source === "firebase" ? firebaseResponses : responsesData;
      if (key === "tags") {
        list[index][key] = el.value.split(",").map(t => t.trim());
      } else {
        list[index][key] = el.value;
      }
    });
  });
}

function deleteEntry(index, source) {
  if (source === "firebase") {
    const entry = firebaseResponses[index];
    db.ref(`gpt4turbo_logs/chest_pain_002/${entry.firebaseKey}`).remove();
    firebaseResponses.splice(index, 1);
    renderFirebaseResponses();
  } else {
    responsesData.splice(index, 1);
    renderResponses();
  }
  log("Entry deleted.");
}

async function generateTTS(index, source) {
  const list = source === "firebase" ? firebaseResponses : responsesData;
  const text = list[index].answer;
  const voice = list[index].role === "proctor" ? "shimmer" : "onyx";

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: "tts-1", voice, input: text })
    });
    const blob = await res.blob();
    const audio = document.getElementById(`audio-${source}-${index}`);
    audio.src = URL.createObjectURL(blob);
    log("TTS generated.");
  } catch (err) {
    log("TTS Error: " + err.message);
  }
}

function log(msg) {
  document.getElementById("logBox").textContent = msg;
}

function removeDuplicates() {
  const seen = new Set();
  responsesData = responsesData.filter((entry) => {
    const key = `${entry.question?.toLowerCase().trim()}|${entry.answer?.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  renderResponses();
  log("Duplicates removed.");
}

document.addEventListener("DOMContentLoaded", () => {
  fetchAllFiles();
  setTimeout(bindInputListeners, 1500); // ensure inputs bind after render
});
