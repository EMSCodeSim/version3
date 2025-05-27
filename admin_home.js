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

  if (!val) {
    console.warn(`❌ No data found for ID ${id}`);
    return;
  }

  // Fetch tags and scoring if missing
  if (!val.tags || !val.skillSheetID || val.points === undefined) {
    try {
      const res = await fetch("/.netlify/functions/gpt_tags_score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: val.question || val.userQuestion || "", answer: val.answer || val.response || "" })
      });

      const raw = await res.text();  // fetch as text to debug bad JSON
      console.log("🔎 GPT raw output:", raw);

      const data = JSON.parse(raw);

      if (data.tags || data.skillSheetID || data.points !== undefined) {
        val.tags = val.tags || data.tags;
        val.skillSheetID = val.skillSheetID || data.skillSheetID;
        val.scoreCategory = val.scoreCategory || data.scoreCategory;
        val.points = val.points !== undefined ? val.points : data.points;
        val.criticalFail = val.criticalFail !== undefined ? val.criticalFail : data.criticalFail;
      } else {
        console.warn("❌ GPT data missing expected fields:", data);
      }
    } catch (err) {
      console.warn(`❌ GPT tag/score failed for ${id}:`, err.message);
    }
  }

  // Fetch TTS audio if missing
  if (!val.ttsAudio) {
    try {
      const res = await fetch("/.netlify/functions/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: val.answer || val.response || "", speaker: val.role || "patient" })
      });
      const audioData = await res.json();
      if (audioData.audio) val.ttsAudio = audioData.audio;
    } catch (err) {
      console.warn(`❌ TTS fetch failed for ${id}:`, err);
    }
  }

  const updatePayload = {
    question: val.question || val.userQuestion || "",
    answer: val.answer || val.response || "",
    tags: val.tags || [],
    skillSheetID: val.skillSheetID || null,
    scoreCategory: val.scoreCategory || null,
    points: val.points ?? null,
    criticalFail: val.criticalFail ?? false,
    role: val.role || "patient",
    ttsAudio: val.ttsAudio || null,
    trigger: val.trigger || val.triggerFileURL || null
  };

  console.log("🧪 FINAL PAYLOAD:", JSON.stringify(updatePayload, null, 2));
  console.log("🧪 Target Ref:", refPath.toString());

  try {
    const existing = await get(refPath);
    if (existing.exists()) {
      await update(refPath, updatePayload);
      console.log(`✅ Updated existing record: ${id}`);
    } else {
      await set(refPath, updatePayload);
      console.log(`✅ Created new record: ${id}`);
    }
    loadApprovedResponses();
  } catch (err) {
    console.error(`❌ Firebase update failed for ${id}:`, err.message);
    alert(`Update failed for ${id}: ${err.message}`);
  }
};

// 🔥 Manual test
window.testFirebaseUpdate = async function () {
  const testId = "manual-test-id";
  const refPath = ref(db, `hardcodedResponses/${testId}`);
  const updatePayload = {
    question: "Test question",
    answer: "Test answer",
    tags: ["test", "update"],
    skillSheetID: "EMT-TEST-01",
    scoreCategory: "Vitals",
    points: 1,
    criticalFail: false,
    role: "patient",
    ttsAudio: "testaudio",
    trigger: "test.jpg"
  };

  try {
    await update(refPath, updatePayload);
    alert("✅ Firebase manual update succeeded!");
  } catch (err) {
    alert("❌ Manual update failed: " + err.message);
    console.error("❌ Firebase update error:", err);
  }
};

window.onload = () => switchTab(currentTab);
