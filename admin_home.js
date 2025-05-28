// admin_home.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, get, set, push, remove, update } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAmpYL8Ywfxkw_h2aMvF2prjiI0m5LYM40",
  authDomain: "ems-code-sim.firebaseapp.com",
  databaseURL: "https://ems-code-sim-default-rtdb.firebaseio.com",
  projectId: "ems-code-sim",
  storageBucket: "ems-code-sim.appspot.com",
  messagingSenderId: "190498607578",
  appId: "1:190498607578:web:4cf6c8e999b027956070e3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

let currentTab = "approved";

window.switchTab = function(tab) {
  currentTab = tab;
  if (tab === "approved") loadApprovedResponses();
  else loadReviewResponses();
};

async function loadApprovedResponses() {
  const dbRef = ref(db, "hardcodedResponses");
  const list = document.getElementById("response-list");
  list.innerHTML = "<b>Loading...</b>";
  try {
    const snap = await get(dbRef);
    let html = "";
    if (snap.exists()) {
      snap.forEach(child => {
        const val = child.val();
        const id = child.key;
        html += `
          <div class="response-block">
            <div><b>Question:</b> ${val.question || "<i>Missing</i>"}</div>
            <div><b>Answer:</b> ${val.answer || val.response || "<i>Missing</i>"}</div>
            <div><b>Role:</b> ${val.role || "<i>patient</i>"}</div>
            <div><b>Tags:</b> ${val.tags ? val.tags.join(", ") : "<span style='color:red'>❌ Missing</span>"}</div>
            <div><b>SkillSheetID:</b> ${val.skillSheetID || "<span style='color:red'>❌ Missing</span>"}</div>
            <div><b>Score Category:</b> ${val.scoreCategory || "<span style='color:red'>❌ Missing</span>"}</div>
            <div><b>Points:</b> ${val.points !== undefined ? val.points : "<span style='color:red'>❌ Missing</span>"}</div>
            <div><b>Critical Fail:</b> ${val.criticalFail ? "✅ Yes" : "❌ No"}</div>
            <div><b>Trigger:</b> ${val.trigger || "<span style='color:red'>❌ Missing</span>"}</div>
            <div><b>Audio:</b><br>
              ${val.ttsAudio ? `<audio controls src="data:audio/mp3;base64,${val.ttsAudio}"></audio>` : "<span style='color:red'>❌ Missing</span>"}
            </div>
            <button onclick="updateSingleResponse('${id}')">🛠 Update This Response</button>
          </div>
        `;
      });
    }
    list.innerHTML = html || "<i>No approved responses found.</i>";
  } catch (e) {
    console.error("Error loading approved responses:", e);
    list.innerHTML = "<span style='color:red;'>Failed to load approved responses.</span>";
  }
}

window.updateAllResponses = async function() {
  const snap = await get(ref(db, "hardcodedResponses"));
  if (!snap.exists()) return alert("No responses found.");

  const updates = [];
  snap.forEach(child => {
    const data = child.val();
    const key = child.key;
    if (!data.tags || !data.skillSheetID || data.points === undefined || !data.ttsAudio) {
      updates.push({ key, data });
    }
  });

  for (const { key, data } of updates) {
    await updateSingleResponse(key, data);
  }

  alert("✅ All missing info has been updated.");
};

window.updateSingleResponse = async function(id, existingData = null) {
  const refPath = ref(db, `hardcodedResponses/${id}`);
  let val = existingData || (await get(refPath)).val();
  if (!val) return;

  try {
    const res = await fetch("/.netlify/functions/gpt_tags_score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userInput: val.question || val.userQuestion || "",
        answer: val.answer || val.response || ""
      })
    });

    const raw = await res.text();
    console.log("🔎 GPT raw output:", raw);
    const data = JSON.parse(raw);

    val.tags = val.tags || data.tags;
    val.scoreCategory = val.scoreCategory || data.scoreCategory;
    val.points = val.points !== undefined ? val.points : data.points;
    val.criticalFail = val.criticalFail !== undefined ? data.criticalFail : false;

    function getSkillSheetIDFromTags(tags) {
      const map = {
        pulse: "EMT-B-MED-19",
        bp: "EMT-B-MED-20",
        respirations: "EMT-B-MED-21",
        oxygen: "EMT-B-MED-36",
        aspirin: "EMT-B-MED-37",
        glucose: "EMT-B-MED-37",
        avpu: "EMT-B-MED-15",
        general_impression: "EMT-B-MED-13",
        transport_decision: "EMT-B-MED-33",
        onset: "EMT-B-MED-25",
        quality: "EMT-B-MED-26",
        radiation: "EMT-B-MED-27",
        severity: "EMT-B-MED-28",
        time: "EMT-B-MED-29",
        allergies: "EMT-B-MED-30",
        medications: "EMT-B-MED-31",
        history: "EMT-B-MED-32",
        chief_complaint: "EMT-B-MED-24",
        interventions: "EMT-B-MED-35"
      };
      if (!tags || !Array.isArray(tags)) return null;
      for (const tag of tags) {
        if (map[tag.toLowerCase()]) return map[tag.toLowerCase()];
      }
      return null;
    }

    val.skillSheetID = val.skillSheetID || getSkillSheetIDFromTags(val.tags);
    console.log("📌 skillSheetID set to:", val.skillSheetID);
  } catch (err) {
    console.warn("❌ GPT failed:", err.message);
  }

  try {
    const updatePayload = {
      question: val.question || val.userQuestion || "",
      answer: val.answer || val.response || "",
      tags: val.tags || [],
      scoreCategory: val.scoreCategory || null,
      points: val.points ?? null,
      criticalFail: val.criticalFail ?? false,
      role: val.role || "patient",
      ttsAudio: val.ttsAudio || null,
      trigger: val.trigger || val.triggerFileURL || null,
      skillSheetID: val.skillSheetID || null
    };

    await set(refPath, updatePayload);
    console.log(`✅ Updated: ${id}`);
  } catch (err) {
    console.error("❌ Firebase write failed:", err.message);
  }

  loadApprovedResponses();
};

window.onload = () => switchTab(currentTab);
