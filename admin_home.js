let responsesData = [];
let firebaseResponses = [];
let allResponses = [];
let audioContext;

const netlifyPaths = [
  "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part1.json",
  "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part2.json",
  "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part3.json"
];

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const skillSheetIDs = [
  "Scene Size-Up", "Primary Survey", "History Taking",
  "Secondary Assessment", "Vital Signs", "Management Plan",
  "Reassessment", "Verbalizes PPE", "Determines Scene Safety",
  "Determines NOI/MOI", "Determines Number of Patients",
  "Requests Additional Help", "Considers C-Spine", "AVPU",
  "Airway/Breathing", "Oxygen Therapy", "Circulation",
  "Shock Management", "Transport Decision", "SAMPLE History",
  "OPQRST", "Field Impression", "Proper Interventions"
];

async function loadAllData() {
  await loadFromNetlify();
  await loadFromFirebase();
  allResponses = deduplicate([...responsesData, ...firebaseResponses]);
  renderResponses();
}

async function loadFromNetlify() {
  responsesData = [];
  for (const path of netlifyPaths) {
    try {
      const res = await fetch(path);
      const json = await res.json();
      responsesData.push(...json);
    } catch (err) {
      console.error("Netlify Load Error:", err);
    }
  }
}

async function loadFromFirebase() {
  firebaseResponses = [];
  const snapshot = await db.ref("hardcodedResponses").once("value");
  const data = snapshot.val();
  if (!data) return;
  firebaseResponses = Object.values(data);
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

  allResponses.forEach((entry, index) => {
    const card = document.createElement("div");
    card.className = "response";

    card.innerHTML = `
      <div class="row">
        <div class="field">
          <label>Question</label>
          <input type="text" value="${entry.question || ""}" data-key="question" data-index="${index}"/>
        </div>
        <div class="field">
          <label>Answer</label>
          <textarea data-key="answer" data-index="${index}">${entry.answer || ""}</textarea>
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>Tags</label>
          <input type="text" value="${entry.tags?.join(", ") || ""}" data-key="tags" data-index="${index}"/>
        </div>
        <div class="field">
          <label>Role</label>
          <input type="text" value="${entry.role || "patient"}" data-key="role" data-index="${index}"/>
        </div>
        <div class="field">
          <label>Score Category</label>
          <select data-key="scoreCategory" data-index="${index}">
            ${skillSheetIDs.map(id => `<option value="${id}" ${entry.scoreCategory === id ? 'selected' : ''}>${id}</option>`).join("")}
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
        allResponses[index][key] = el.value.split(",").map(t => t.trim());
      } else {
        allResponses[index][key] = el.value;
      }
    });
  });
}

function deleteEntry(index) {
  allResponses.splice(index, 1);
  renderResponses();
  log("Entry deleted.");
}

async function generateTTS(index) {
  const text = allResponses[index].answer;
  const voice = allResponses[index].role === "proctor" ? "shimmer" : "onyx";
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
  const box = document.getElementById("logBox");
  if (box) box.textContent = message;
}

document.addEventListener("DOMContentLoaded", loadAllData);
