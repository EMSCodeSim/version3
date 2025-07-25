let responsesData = [];
let audioContext;

const firebaseApp = firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
});
const db = firebaseApp.database();

// 🌐 Pull from hosted chest pain scenario parts
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
      const entries = Array.isArray(json) ? json : (json.responses || []);
      console.log(`✅ Loaded ${entries.length} entries from ${path}`);
      all = all.concat(entries);
    } catch (err) {
      log(`❌ Failed to load ${path}: ${err.message}`);
    }
  }
  responsesData = deduplicate(all);
  renderResponses();
}

function deduplicate(dataArray) {
  const seen = new Set();
  const deduped = [];

  for (const entry of dataArray) {
    const key = `${entry.question?.toLowerCase().trim()}|${entry.answer?.toLowerCase().trim()}`;
    if (!seen.has(key) && (entry.question || entry.answer)) {
      seen.add(key);
      deduped.push(entry);
    }
  }
  log(`✅ Loaded ${dataArray.length} entries, ${deduped.length} after removing duplicates.`);
  return deduped;
}

function log(message) {
  document.getElementById("logBox").textContent = message;
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
          <input type="text" value="${entry.scoreCategory || ""}" data-key="scoreCategory" data-index="${index}"/>
        </div>
      </div>
      <div class="row">
        <button class="btn" onclick="generateTTS(${index})">🔊 Voice</button>
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
  log("🗑️ Entry deleted.");
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
    log("🎧 Voice generated.");
  } catch (err) {
    log("⚠️ TTS error: " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", fetchAllFiles);
