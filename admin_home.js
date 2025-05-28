// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get, set, remove } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// ✅ Your Firebase config
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

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🔢 Categories for auto-tagging logic
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

// 🔁 Render entries
function renderResponseCard(key, data, isReview = false) {
  const container = document.getElementById("responsesContainer");
  const div = document.createElement("div");
  const missing = !data.scoreCategory || data.scoreCategory.trim() === "" || data.points === undefined;

  div.className = "response" + (missing ? " missing" : "");
  div.innerHTML = `
    <div class="field"><strong>Question:</strong> <div contenteditable="true" id="q-${key}">${data.question || ""}</div></div>
    <div class="field"><strong>Response:</strong> <div contenteditable="true" id="r-${key}">${data.response || ""}</div></div>
    <div class="field"><strong>Score Category:</strong> <div contenteditable="true" id="cat-${key}">${data.scoreCategory || suggestCategory(data)}</div></div>
    <div class="field"><strong>Points:</strong> <div contenteditable="true" id="pts-${key}">${data.points !== undefined ? data.points : 1}</div></div>
    <div class="field"><strong>Critical Fail (true/false):</strong> <div contenteditable="true" id="cf-${key}">${data.criticalFail || "false"}</div></div>
    ${isReview
      ? `<button onclick="saveResponse('${key}')">✅ Approve</button><button onclick="deleteResponse('${key}', 'hardcodedReview')">🗑 Delete</button>`
      : `<button onclick="deleteResponse('${key}', 'hardcodedResponses')">🗑 Delete</button>`}
  `;
  container.appendChild(div);
}

// 🔍 Suggest best scoreCategory match
function suggestCategory(data) {
  const combined = `${data.question} ${data.response}`.toLowerCase();
  for (let item of validSkillSheet) {
    if (combined.includes(item.name.toLowerCase())) return item.name;
  }
  return "";
}

// 🔄 Load Tabs
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

// 💾 Save Approved
window.saveResponse = async function (key) {
  const question = document.getElementById(`q-${key}`).innerText.trim();
  const response = document.getElementById(`r-${key}`).innerText.trim();
  const scoreCategory = document.getElementById(`cat-${key}`).innerText.trim();
  const points = parseInt(document.getElementById(`pts-${key}`).innerText.trim()) || 0;
  const criticalFail = document.getElementById(`cf-${key}`).innerText.trim() === "true";

  const data = { question, response, scoreCategory, points, criticalFail };
  await set(ref(db, `hardcodedResponses/${key}`), data);
  await remove(ref(db, `hardcodedReview/${key}`));
  alert("✅ Approved and moved.");
  location.reload();
};

// 🗑 Delete
window.deleteResponse = async function (key, path) {
  await remove(ref(db, `${path}/${key}`));
  alert("🗑 Deleted.");
  location.reload();
};

// 🧠 Check for missing fields
window.updateAllResponses = async function () {
  const snap = await get(ref(db, "hardcodedReview"));
  let issues = [];
  snap.forEach(child => {
    const val = child.val();
    if (!val.scoreCategory || val.scoreCategory.trim() === "") {
      issues.push(`Missing scoreCategory: ${child.key}`);
    }
    if (val.points === undefined) {
      issues.push(`Missing points: ${child.key}`);
    }
    if (val.criticalFail === undefined) {
      issues.push(`Missing criticalFail: ${child.key}`);
    }
  });
  if (issues.length === 0) {
    alert("✅ All reviewed entries have valid fields.");
  } else {
    alert("⚠️ Issues found:\n" + issues.join("\n"));
  }
};

// 👇 Visual tab switcher
function switchTabs() {
  document.getElementById("approvedTab").classList.toggle("active", currentTab === "approved");
  document.getElementById("reviewTab").classList.toggle("active", currentTab === "review");
}

let currentTab = "approved"; // default
