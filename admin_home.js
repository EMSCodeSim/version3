import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get, set, remove, update } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// ======= Advanced Mapping Tables =======
const skillSheetMap = {
  "Scene Safety": "sceneSafety",
  "Primary Assessment": "primaryAssessment",
  "Vitals BP": "vitalsBP",
  "Vitals Pulse": "vitalsPulse",
  "Vitals Respirations": "vitalsRespirations",
  "History SAMPLE": "historySAMPLE",
  "Secondary Assessment": "secondaryAssessment",
  "Reassessment": "reassessment",
  "Administer Oxygen": "administerOxygen",
  "Administer Glucose": "administerGlucose",
  "Immobilization": "immobilization",
  "Control Bleeding": "controlBleeding",
  "Airway Management": "airwayManagement",
  // ...add more as needed!
};
const tagSkillSheetMap = {
  oxygen: "administerOxygen",
  glucose: "administerGlucose",
  splint: "immobilization",
  bleeding: "controlBleeding",
  airway: "airwayManagement",
  // ...add more as needed!
};

// ======= Mass Update Button Logic =======
window.massUpdateSkillSheetIDs = async function () {
  const snap = await get(ref(db, "hardcodedResponses"));
  if (!snap.exists()) {
    alert("No approved entries found.");
    return;
  }
  const data = snap.val();
  const updates = {};
  let noMatchCount = 0;

  Object.entries(data).forEach(([key, entry]) => {
    if (!entry.skillSheetID) {
      let newID = null;
      // 1. Try mapping from scoreCategory (case-insensitive)
      if (entry.scoreCategory) {
        const catKey = entry.scoreCategory.trim().toLowerCase();
        for (const mapKey in skillSheetMap) {
          if (catKey === mapKey.trim().toLowerCase()) {
            newID = skillSheetMap[mapKey];
            break;
          }
        }
      }
      // 2. Else, check tags (case-insensitive, first match wins)
      if (!newID && Array.isArray(entry.tags)) {
        for (const tag of entry.tags) {
          for (const tagMapKey in tagSkillSheetMap) {
            if (tag.trim().toLowerCase() === tagMapKey.trim().toLowerCase()) {
              newID = tagSkillSheetMap[tagMapKey];
              break;
            }
          }
          if (newID) break;
        }
      }
      if (newID) {
        updates[`hardcodedResponses/${key}/skillSheetID`] = newID;
      } else {
        noMatchCount++;
        console.log("No skillSheetID match for:", entry.scoreCategory, entry.tags);
      }
    }
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
    alert(`✅ Updated skillSheetID for ${Object.keys(updates).length} responses. No match for ${noMatchCount} responses (see console log).`);
    location.reload();
  } else {
    alert("No missing skillSheetID fields found, or no mapping matched.");
  }
};

// ======= GPT-powered SkillSheetID Assignment =======
window.autoAssignSkillSheetIDWithGPT = async function () {
  const snap = await get(ref(db, "hardcodedResponses"));
  if (!snap.exists()) {
    alert("No approved entries found.");
    return;
  }
  const data = snap.val();
  let updatedCount = 0;
  for (const [key, entry] of Object.entries(data)) {
    if (!entry.skillSheetID) {
      try {
        const res = await fetch("/.netlify/functions/gpt_skill_id", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: entry.question,
            response: entry.response,
            tags: entry.tags
          })
        });
        const result = await res.json();
        if (res.ok && result.skillSheetID) {
          await set(ref(db, `hardcodedResponses/${key}/skillSheetID`), result.skillSheetID);
          updatedCount++;
        } else {
          console.warn(`GPT did not return a skillSheetID for key: ${key}`);
        }
      } catch (err) {
        console.warn(`Error assigning skillSheetID for ${key}`, err);
      }
    }
  }
  alert(`Auto-assigned skillSheetID for ${updatedCount} responses.`);
  location.reload();
};

// ========== FIREBASE SETUP ==========
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

// ========== CARD RENDER ==========
function renderResponseCard(key, data, isReview = false) {
  const container = document.getElementById("responsesContainer");
  const isInvalid = !(data.response || data.answer) || (data.scoreCategory && data.scoreCategory.trim() === "") || (data.scoreCategory && data.scoreCategory.toLowerCase() === "assessment");

  const div = document.createElement("div");
  div.className = "response" + (isInvalid ? " missing" : "");

  div.innerHTML = `
    <div class="field"><strong>Question:</strong> <div contenteditable="true" id="q-${key}">${data.question || ""}</div></div>
    <div class="field"><strong>Response:</strong> <div contenteditable="true" id="r-${key}">${data.response || data.answer || ""}</div></div>
    <div class="field"><strong>Skill Sheet ID:</strong> <div contenteditable="true" id="skillSheetID-${key}">${data.skillSheetID || ""}</div></div>
    <div class="field"><strong>Score Category:</strong> <div contenteditable="true" id="cat-${key}">${data.scoreCategory || ""}</div></div>
    <div class="field"><strong>Points:</strong> <div contenteditable="true" id="pts-${key}">${data.points !== undefined ? data.points : ""}</div></div>
    <div class="field"><strong>Critical Fail (true/false):</strong> <div contenteditable="true" id="cf-${key}">${data.criticalFail !== undefined ? data.criticalFail : ""}</div></div>
    <div class="field"><strong>Role:</strong> <div contenteditable="true" id="role-${key}">${data.role || ""}</div></div>
    <div class="field"><strong>Tags:</strong> <div contenteditable="true" id="tags-${key}">${Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "")}</div></div>
    <div class="field"><strong>Trigger:</strong> <div contenteditable="true" id="trigger-${key}">${data.trigger || ""}</div></div>
    <div class="field"><strong>TTS Audio (readonly):</strong><br>
      ${data.ttsAudio ? `<audio controls src="${data.ttsAudio.startsWith("data:") ? data.ttsAudio : `data:audio/mp3;base64,${data.ttsAudio}`}"></audio>` : '<em>No audio</em>'}
    </div>
    <button onclick="saveResponse('${key}', ${isReview})">💾 Save</button>
    ${isReview
      ? `<button onclick="autoTagSingleResponse('${key}')">♻️ Auto-Tag This Entry</button>
         <button onclick="deleteResponse('${key}', 'hardcodedReview')">🗑 Delete</button>`
      : `<button onclick="deleteResponse('${key}', 'hardcodedResponses')">🗑 Delete</button>
         <button onclick="autoTagSingleApprovedResponse('${key}')">♻️ Auto-Tag This Approved Entry</button>`}
  `;
  container.appendChild(div);
}

// ========== LOAD ENTRIES ==========
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

// ========== SAVE ==========
window.saveResponse = async function (key, isReview = false) {
  const build = id => document.getElementById(`${id}-${key}`)?.innerText.trim();
  const path = isReview ? "hardcodedReview" : "hardcodedResponses";

  const updated = {
    question: build("q"),
    response: build("r"),
    skillSheetID: build("skillSheetID"),
    scoreCategory: build("cat"),
    points: parseInt(build("pts")) || 0,
    criticalFail: build("cf") === "true",
    role: build("role"),
    tags: build("tags")?.split(",").map(t => t.trim()).filter(t => t),
    trigger: build("trigger")
    // ttsAudio will be added below
  };

  // Call TTS endpoint to generate new audio (update this endpoint as needed)
  let ttsAudio = "";
  try {
    const res = await fetch("/.netlify/functions/tts_generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: updated.response,
        voice: updated.role && updated.role.toLowerCase().includes("proctor") ? "shimmer" : "onyx"
      })
    });
    const result = await res.json();
    if (res.ok && result.audio) {
      ttsAudio = result.audio.startsWith("data:") ? result.audio : `data:audio/mp3;base64,${result.audio}`;
    }
  } catch (err) {
    alert("Warning: TTS generation failed, entry saved without new audio.");
    console.error("TTS failed:", err.message);
  }
  updated.ttsAudio = ttsAudio;

  await set(ref(db, `${path}/${key}`), updated);
  alert("💾 Saved! Entry and TTS updated.");
  location.reload();
};

// ========== DELETE ==========
window.deleteResponse = async function (key, path) {
  await remove(ref(db, `${path}/${key}`));
  alert("🗑 Deleted.");
  location.reload();
};

// ========== VALIDATE ==========
window.updateAllResponses = async function () {
  const snap = await get(ref(db, "hardcodedReview"));
  const issues = [];
  snap.forEach(child => {
    const val = child.val();
    if (!(val.response || val.answer)) issues.push(`${child.key} — Missing response`);
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

// ========== AUTO TAG ALL APPROVED ==========
window.autoTagAllApprovedResponses = async function () {
  const snap = await get(ref(db, "hardcodedResponses"));
  if (!snap.exists()) {
    alert("⚠️ No approved entries found.");
    return;
  }

  const data = snap.val();
  const keys = Object.keys(data);

  for (const key of keys) {
    const val = data[key];
    if (!(val.response || val.answer) || !val.question) continue;

    try {
      const res = await fetch("/.netlify/functions/gpt_tagger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: val.question, response: val.response || val.answer })
      });

      const result = await res.json();
      if (res.ok) {
        await set(ref(db, `hardcodedResponses/${key}`), {
          ...val,
          response: val.response || val.answer,
          skillSheetID: val.skillSheetID || "",
          tags: result.tags,
          scoreCategory: result.scoreCategory,
          criticalFail: result.criticalFail
        });

        const logBox = document.getElementById("logBox");
        if (logBox) logBox.innerHTML += `<div style="color:green;">✅ Tagged ${key}</div>`;
      } else {
        console.warn(`❌ GPT failed for ${key}`, result.error);
      }
    } catch (err) {
      console.error(`Error tagging ${key}:`, err.message);
    }
  }

  alert("✅ Auto-tagging complete!");
  location.reload();
};

// ========== AUTO TAG SINGLE APPROVED ==========
window.autoTagSingleApprovedResponse = async function (key) {
  const question = document.getElementById(`q-${key}`)?.innerText.trim();
  const response = document.getElementById(`r-${key}`)?.innerText.trim();
  const skillSheetID = document.getElementById(`skillSheetID-${key}`)?.innerText.trim();

  if (!question || !response) {
    alert("❌ Missing question or response.");
    return;
  }

  const logBox = document.getElementById("logBox");
  logBox.innerHTML += `<div>⏳ Tagging approved entry <strong>${key}</strong>...</div>`;

  try {
    const res = await fetch("/.netlify/functions/gpt_tagger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, response })
    });

    const result = await res.json();
    if (res.ok) {
      const existing = await get(ref(db, `hardcodedResponses/${key}`));
      await set(ref(db, `hardcodedResponses/${key}`), {
        ...(existing.exists() ? existing.val() : {}),
        question,
        response,
        skillSheetID,
        scoreCategory: result.scoreCategory,
        criticalFail: result.criticalFail,
        tags: result.tags
      });

      logBox.innerHTML += `<div style="color:green;">✅ Updated approved ${key} — ${result.scoreCategory}</div>`;
    } else {
      logBox.innerHTML += `<div style="color:red;">❌ GPT failed for approved ${key}: ${result.error}</div>`;
    }
  } catch (err) {
    logBox.innerHTML += `<div style="color:red;">❌ Error updating approved ${key}: ${err.message}</div>`;
  }
};

// ========== AUTO TAG SINGLE REVIEW ==========
window.autoTagSingleResponse = async function (key) {
  const question = document.getElementById(`q-${key}`)?.innerText.trim();
  const response = document.getElementById(`r-${key}`)?.innerText.trim();
  const skillSheetID = document.getElementById(`skillSheetID-${key}`)?.innerText.trim();

  if (!question || !response) {
    alert("❌ Missing question or response.");
    return;
  }

  const logBox = document.getElementById("logBox");
  logBox.innerHTML += `<div>⏳ Tagging review entry <strong>${key}</strong>...</div>`;

  try {
    const res = await fetch("/.netlify/functions/gpt_tagger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, response })
    });

    const result = await res.json();
    if (res.ok) {
      await set(ref(db, `hardcodedReview/${key}`), {
        question,
        response,
        skillSheetID,
        scoreCategory: result.scoreCategory,
        criticalFail: result.criticalFail,
        tags: result.tags
      });

      logBox.innerHTML += `<div style="color:green;">✅ Updated review ${key} — ${result.scoreCategory}</div>`;
    } else {
      logBox.innerHTML += `<div style="color:red;">❌ GPT failed for review ${key}: ${result.error}</div>`;
    }
  } catch (err) {
    logBox.innerHTML += `<div style="color:red;">❌ Error updating review ${key}: ${err.message}</div>`;
  }
};

// ========== TAB TOGGLE ==========
function switchTabs() {
  document.getElementById("approvedTab").classList.toggle("active", currentTab === "approved");
  document.getElementById("reviewTab").classList.toggle("active", currentTab === "review");
}
