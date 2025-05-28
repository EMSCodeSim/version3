import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get, set, remove } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAmpYL8Ywfxkw_h2aMvF2prjiI0m5LYM40",
  authDomain: "ems-code-sim.firebaseapp.com",
  databaseURL: "https://ems-code-sim-default-rtdb.firebaseio.com",
  projectId: "ems-code-sim",
  storageBucket: "ems-code-sim.firebasestorage.app",
  messagingSenderId: "190498607578",
  appId: "1:190498607578:web:4cf6c8e999b027956070e3",
  measurementId: "G-2Q3ZT01YT1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let currentTab = "approved";

// 🔢 Example NREMT skills
const validSkillSheet = [
  { id: "1", name: "BSI Scene Safe" },
  { id: "2", name: "Scene Safety" },
  { id: "3", name: "Determines MOI/NOI" },
  { id: "4", name: "Determines Number of Patients" },
  { id: "5", name: "Requests Additional EMS Assistance" },
  { id: "6", name: "Considers C-Spine Stabilization" },
  { id: "7", name: "General Impression" },
  { id: "8", name: "Determines Chief Complaint" },
  { id: "9", name: "Assesses Airway" }
];

// 🧠 Auto-suggest from known score categories
function suggestCategory(data) {
  const combined = `${data.question} ${data.response}`.toLowerCase();
  for (let item of validSkillSheet) {
    if (combined.includes(item.name.toLowerCase())) return item.name;
  }
  return "";
}

// 🔁 Render each card
function renderResponseCard(key, data, isReview = false) {
  const container = document.getElementById("responsesContainer");

  const isInvalid = !data.scoreCategory || data.scoreCategory.trim() === "" || data.scoreCategory.toLowerCase() === "assessment" || !data.response;

  const div = document.createElement("div");
  div.className = "response" + (isInvalid ? " missing" : "");

  div.innerHTML = `
    <div class="field"><strong>Question:</strong> <div contenteditable="true" id="q-${key}">${data.question || "Missing"}</div></div>
    <div class="field"><strong>Response:</strong> <div contenteditable="true" id="r-${key}">${data.response || "Missing"}</div></div>
    <div class="field"><strong>Score Category:</strong> <div contenteditable="true" id="cat-${key}">${data.scoreCategory || suggestCategory(data)}</div></div>
    <div class="field"><strong>Points:</strong> <div contenteditable="true" id="pts-${key}">${data.points !== undefined ? data.points : 0}</div></div>
    <div class="field"><strong>Critical Fail (true/false):</strong> <div contenteditable="true" id="cf-${key}">${data.criticalFail !== undefined ? data.criticalFail : "false"}</div></div>

    <div class="field"><strong>Role:</strong> <div contenteditable="true" id="role-${key}">${data.role || "Patient"}</div></div>
    <div class="field"><strong>Tags:</strong> <div contenteditable="true" id="tags-${key}">${Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "")}</div></div>
    <div class="field"><strong>Trigger:</strong> <div contenteditable="true" id="trigger-${key}">${data.trigger || ""}</div></div>

    ${data.ttsAudio ? `
      <div class="field"><strong>TTS Audio:</strong>
        <audio controls src="${data.ttsAudio.startsWith("data:") ? data.ttsAudio : `data:audio/mp3;base64,${data.ttsAudio}`}"></audio>
      </div>` : ''}

    ${isReview
      ? `<button onclick="saveResponse('${key}')">✅ Approve</button><button onclick="deleteResponse('${key}', 'hardcodedReview')">🗑 Delete</button>`
      : `<button onclick="deleteResponse('${key}', 'hardcodedResponses')">🗑 Delete</button>`}
  `;

  container.appendChild(div);
}

// 🔁 Load from database
window.loadApproved = async function () {
  currentTab = "approved";
  switchTabs();
  const snap = await get(ref(db, "hardcodedResponses"));
  document.getElementById("responsesContainer").innerHTML = "";
  snap.forEach(child => renderResponseCard(child.key, child.val(), false));
};

window.loadReview = async function () {
  currentTab = "review";
  switchTabs();
  const snap = await get(ref(db, "hardcodedReview"));
  document.getElementById("responsesContainer").innerHTML = "";
  snap.forEach(child => renderResponseCard(child.key, child.val(), true));
};

// 💾 Save to hardcodedResponses
window.saveResponse = async function (key) {
  const build = id => document.getElementById(`${id}-${key}`)?.innerText.trim();

  const updated = {
    question: build("q"),
    response: build("r"),
    scoreCategory: build("cat"),
    points: parseInt(build("pts")) || 0,
    criticalFail: build("cf") === "true",
    role: build("role"),
    tags: build("tags")?.split(",").map(t => t.trim()).filter(t => t),
    trigger: build("trigger")
  };

  await set(ref(db, `hardcodedResponses/${key}`), updated);
  await remove(ref(db, `hardcodedReview/${key}`));
  alert("✅ Saved and moved to Approved.");
  location.reload();
};

// 🗑 Delete any entry
window.deleteResponse = async function (key, path) {
  await remove(ref(db, `${path}/${key}`));
  alert("🗑 Deleted.");
  location.reload();
};

// 🔍 Validate for missing or vague fields
window.updateAllResponses = async function () {
  const snap = await get(ref(db, "hardcodedReview"));
  const issues = [];
  snap.forEach(child => {
    const val = child.val();
    if (!val.response || val.response.trim() === "") issues.push(`${child.key} — Missing response`);
    if (!val.scoreCategory || val.scoreCategory.toLowerCase() === "assessment") issues.push(`${child.key} — Invalid scoreCategory`);
    if (val.points === undefined) issues.push(`${child.key} — Missing points`);
    if (val.criticalFail === undefined) issues.push(`${child.key} — Missing criticalFail`);
  });
  if (issues.length === 0) {
    alert("✅ All reviewed entries are properly tagged.");
  } else {
    alert("⚠️ Issues found:\n" + issues.join("\n"));
  }
};

// 🧭 Highlight current tab
function switchTabs() {
  document.getElementById("approvedTab").classList.toggle("active", currentTab === "approved");
  document.getElementById("reviewTab").classList.toggle("active", currentTab === "review");
}
