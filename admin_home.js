// ✅ FULL UPDATED admin_home.js with Firebase support and TTS

let responsesData = [];
let audioContext;

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
          <input type="text" value="${entry.question || ""}" data-key="question" data-index="${index}" style="width: 95%"/>
        </div>
        <div class="field">
          <label>Answer</label>
          <textarea data-key="answer" data-index="${index}" style="width: 95%">${entry.answer || ""}</textarea>
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>Tags</label>
          <input type="text" value="${entry.tags?.join(", ") || ""}" data-key="tags" data-index="${index}" style="width: 95%"/>
        </div>
        <div class="field">
          <label>Role</label>
          <input type="text" value="${entry.role || "patient"}" data-key="role" data-index="${index}" style="width: 95%"/>
        </div>
        <div class="field">
          <label>Score Category</label>
          <input type="text" value="${entry.scoreCategory || ""}" data-key="scoreCategory" data-index="${index}" style="width: 95%"/>
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
  document.querySelectorAll("#responsesContainer input, #responsesContainer textarea").forEach((el) => {
    el.addEventListener("input", (e) => {
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

// ✅ Load both local + Firebase on page load
document.addEventListener("DOMContentLoaded", async () => {
  await fetchAllFiles();
  await fetchFirebaseResponses();
});
