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
  { id: "1", name: "BSI Scene Safe", points: 1 },
  { id: "2", name: "Scene Safety", points: 1 },
  { id: "3", name: "Determines MOI/NOI", points: 1 },
  { id: "4", name: "Determines Number of Patients", points: 1 },
  { id: "5", name: "Requests Additional EMS Assistance", points: 1 },
  { id: "6", name: "Considers C-Spine Stabilization", points: 1 },
  { id: "7", name: "General Impression", points: 1 },
  { id: "8", name: "Determines Responsiveness (AVPU)", points: 1 },
  { id: "9", name: "Determines Chief Complaint", points: 1 },
  { id: "10", name: "Assess Airway", points: 1 },
  { id: "11", name: "Assess Breathing", points: 1 },
  { id: "12", name: "Initiates Oxygen Therapy", points: 1 },
  { id: "13", name: "Assures Adequate Ventilation", points: 1 },
  { id: "14", name: "Manages Airway Compromise", points: 1 },
  { id: "15", name: "Assess Circulation", points: 1 },
  { id: "16", name: "Assesses Skin (Color, Temp, Condition)", points: 1 },
  { id: "17", name: "Controls Major Bleeding", points: 1 },
  { id: "18", name: "Initiates Shock Management", points: 1 },
  { id: "19", name: "Identifies Patient Priority / Transport", points: 1 },
  { id: "20", name: "OPQRST - Onset", points: 1 },
  { id: "21", name: "OPQRST - Provocation", points: 1 },
  { id: "22", name: "OPQRST - Quality", points: 1 },
  { id: "23", name: "OPQRST - Radiation", points: 1 },
  { id: "24", name: "OPQRST - Severity", points: 1 },
  { id: "25", name: "OPQRST - Time", points: 1 },
  { id: "26", name: "SAMPLE - Signs/Symptoms", points: 1 },
  { id: "27", name: "SAMPLE - Allergies", points: 1 },
  { id: "28", name: "SAMPLE - Medications", points: 1 },
  { id: "29", name: "SAMPLE - Past Medical History", points: 1 },
  { id: "30", name: "SAMPLE - Last Oral Intake", points: 1 },
  { id: "31", name: "SAMPLE - Events Leading to Present Illness", points: 1 },
  { id: "32", name: "Assess Affected Body Part/System", points: 1 },
  { id: "33", name: "Obtain Baseline Vital Signs", points: 1 },
  { id: "34", name: "Reassess Vital Signs", points: 1 },
  { id: "35", name: "Field Impression", points: 1 },
  { id: "36", name: "Interventions (Verbalize)", points: 1 },
  { id: "37", name: "Demonstrates How and When to Reassess", points: 1 },
  { id: "38", name: "Verbal Report to Arriving EMS / Hospital", points: 1 },
  { id: "CF1", name: "Failure to Provide Oxygen", points: 0, criticalFail: true },
  { id: "CF2", name: "Failure to Control Major Bleeding", points: 0, criticalFail: true },
  { id: "CF3", name: "Failure to Initiate Transport Within 15 Minutes", points: 0, criticalFail: true },
  { id: "CF4", name: "Performs Dangerous Intervention", points: 0, criticalFail: true },
  { id: "CF5", name: "Fails to Manage Patient as EMT", points: 0, criticalFail: true },
  { id: "CF6", name: "Exhibits Unsafe Practices", points: 0, criticalFail: true },
  { id: "CF7", name: "Fails to Address Life-Threats First", points: 0, criticalFail: true }
];

function suggestCategory(data) {
  const combined = `${data.question} ${data.response}`.toLowerCase();
  for (let item of validSkillSheet) {
    if (combined.includes(item.name.toLowerCase())) return item.name;
  }
  return "";
}

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

window.deleteResponse = async function (key, path) {
  await remove(ref(db, `${path}/${key}`));
  alert("🗑 Deleted.");
  location.reload();
};

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

// 🧠 Auto-tag everything in review
window.autoTagAllResponses = async function () {
  const snap = await get(ref(db, "hardcodedReview"));
  const updates = [];

  for (const child of snap._node.children.values()) {
    const key = child.key;
    const val = child.value.value_;

    if (!val.response || !val.question) continue;

    try {
      const res = await fetch("/.netlify/functions/gpt_tagger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: val.question, response: val.response })
      });

      const result = await res.json();
      if (res.ok) {
        await set(ref(db, `hardcodedReview/${key}`), {
          ...val,
          tags: result.tags,
          scoreCategory: result.scoreCategory,
          criticalFail: result.criticalFail
        });
        console.log(`✅ Updated ${key}`);
      } else {
        console.warn(`⚠️ GPT failed for ${key}`, result.error);
      }
    } catch (err) {
      console.error("Tagging error for", key, err.message);
    }
  }

  alert("✅ Auto-tagging complete!");
  location.reload();
};

function switchTabs() {
  document.getElementById("approvedTab").classList.toggle("active", currentTab === "approved");
  document.getElementById("reviewTab").classList.toggle("active", currentTab === "review");
}
