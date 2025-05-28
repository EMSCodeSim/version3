import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update, remove } from "firebase/database";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAmpYL8Ywfxkw_h2aMvF2prjiI0m5LYM40",
  authDomain: "ems-code-sim.firebaseapp.com",
  databaseURL: "https://ems-code-sim-default-rtdb.firebaseio.com",
  projectId: "ems-code-sim",
  storageBucket: "ems-code-sim.appspot.com",
  messagingSenderId: "190498607578",
  appId: "1:190498607578:web:4cf6c8e999b027956070e3",
  measurementId: "G-2Q3ZT01YT1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const validSkillSheet = [ // abbreviated list, full version in previous message
  { id: "1", name: "BSI Scene Safe", points: 1 },
  { id: "2", name: "Scene Safety", points: 1 },
  ...
];

function suggestCategory(text) {
  if (!text) return "Missing";
  const lower = text.toLowerCase();
  const match = validSkillSheet.find(item => lower.includes(item.name.toLowerCase()));
  return match ? match.name : "Unknown";
}

function loadResponses() {
  const reviewRef = ref(db, "hardcodedReview");
  const approvedRef = ref(db, "hardcodedResponses");

  get(reviewRef).then(snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(key => renderResponseCard(key, data[key], true));
    }
  });

  get(approvedRef).then(snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(key => renderResponseCard(key, data[key], false));
    }
  });
}

function renderResponseCard(key, data, isReview) {
  const container = document.getElementById("responsesContainer");

  const invalidCategory = !data.scoreCategory || data.scoreCategory === "Assessment";
  const missingResponse = !data.response;

  const div = document.createElement("div");
  div.className = "response" + (invalidCategory || missingResponse ? " missing" : "");

  div.innerHTML = `
    <div><strong>Question:</strong> <div contenteditable="true" id="q-${key}">${data.question || "Missing"}</div></div>
    <div><strong>Response:</strong> <div contenteditable="true" id="r-${key}">${data.response || "Missing"}</div></div>
    <div><strong>Score Category:</strong> <div contenteditable="true" id="cat-${key}">${data.scoreCategory || "Missing"}</div></div>
    <div><strong>Points:</strong> <div contenteditable="true" id="pts-${key}">${data.points ?? "1"}</div></div>
    <div><strong>Critical Fail:</strong> <div contenteditable="true" id="cf-${key}">${data.criticalFail ?? "false"}</div></div>
    <div><strong>Role:</strong> <div contenteditable="true" id="role-${key}">${data.role || "Unknown"}</div></div>
    <div><strong>Tags:</strong> <div contenteditable="true" id="tags-${key}">${Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "")}</div></div>
    <div><strong>Trigger:</strong> <div contenteditable="true" id="trig-${key}">${data.trigger || ""}</div></div>
    <div><strong>TTS Audio:</strong> ${data.ttsAudio ? `<audio controls src="${data.ttsAudio}"></audio>` : "None"}</div>
    ${isReview
      ? `<button onclick="saveResponse('${key}')">✅ Approve</button>
         <button onclick="deleteResponse('${key}', 'hardcodedReview')">🗑 Delete</button>`
      : `<button onclick="deleteResponse('${key}', 'hardcodedResponses')">🗑 Delete</button>`}
  `;
  container.appendChild(div);
}

window.saveResponse = function (key) {
  const question = document.getElementById(`q-${key}`).innerText;
  const response = document.getElementById(`r-${key}`).innerText;
  const scoreCategory = document.getElementById(`cat-${key}`).innerText;
  const points = parseInt(document.getElementById(`pts-${key}`).innerText) || 0;
  const criticalFail = document.getElementById(`cf-${key}`).innerText === "true";
  const role = document.getElementById(`role-${key}`).innerText;
  const tags = document.getElementById(`tags-${key}`).innerText.split(",").map(tag => tag.trim());
  const trigger = document.getElementById(`trig-${key}`).innerText;

  const approvedRef = ref(db, `hardcodedResponses/${key}`);
  const reviewRef = ref(db, `hardcodedReview/${key}`);

  update(approvedRef, {
    question, response, scoreCategory, points, criticalFail,
    role, tags, trigger
  }).then(() => remove(reviewRef));
}

window.deleteResponse = function (key, path) {
  const delRef = ref(db, `${path}/${key}`);
  remove(delRef).then(() => {
    document.getElementById("responsesContainer").innerHTML = "";
    loadResponses();
  });
}

window.onload = loadResponses;
