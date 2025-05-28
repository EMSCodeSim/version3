import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, onValue, set, remove, get, child } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let currentTab = "approved";

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
  // Add more based on full skill sheet
];

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

function suggestCategory(data) {
  const combined = `${data.question} ${data.response}`.toLowerCase();
  for (let item of validSkillSheet) {
    if (combined.includes(item.name.toLowerCase())) return item.name;
  }
  return "";
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

window.deleteResponse = async function (key, path) {
  await remove(ref(db, `${path}/${key}`));
  alert("🗑 Deleted.");
  location.reload();
};

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

function switchTabs() {
  document.getElementById("approvedTab").classList.toggle("active", currentTab === "approved");
  document.getElementById("reviewTab").classList.toggle("active", currentTab === "review");
}
