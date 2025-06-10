import { skillSheetScoring } from './grading_skill_sheet.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get, set, remove, update } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// ======= Mapping Tables (if you still need them for lookups) =======
const skillSheetMap = {
  // ... existing mapping if needed ...
};
const tagSkillSheetMap = {
  // ... existing mapping if needed ...
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

  const ssid = data.skillSheetID;
  const meta = skillSheetScoring[ssid] || {};
  const pointsDisplay = (meta.points !== undefined ? meta.points : (data.points !== undefined ? data.points : ""));
  const labelDisplay = meta.label || data.scoreCategory || "";

  const div = document.createElement("div");
  div.className = "response" + (isInvalid ? " missing" : "");

  div.innerHTML = `
    <div class="field"><strong>Question:</strong> <div contenteditable="true" id="q-${key}">${data.question || ""}</div></div>
    <div class="field"><strong>Response:</strong> <div contenteditable="true" id="r-${key}">${data.response || data.answer || ""}</div></div>
    <div class="field"><strong>Skill Sheet ID:</strong> <div contenteditable="true" id="skillSheetID-${key}">${ssid || ""}</div></div>
    <div class="field"><strong>Score Category:</strong> <div contenteditable="true" id="cat-${key}">${labelDisplay}</div></div>
    <div class="field"><strong>Points:</strong> <div contenteditable="true" id="pts-${key}">${pointsDisplay}</div></div>
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
  const ssid = build("skillSheetID");
  const meta = skillSheetScoring[ssid] || {};
  const updated = {
    question: build("q"),
    response: build("r"),
    skillSheetID: ssid,
    scoreCategory: meta.label || build("cat"),
    points: meta.points !== undefined ? meta.points : parseInt(build("pts")) || 0,
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
        // assign skillSheetID, label, and points if possible
        const meta = skillSheetScoring[result.skillSheetID] || {};
        await set(ref(db, `hardcodedResponses/${key}`), {
          ...val,
          response: val.response || val.answer,
          skillSheetID: result.skillSheetID || "",
          scoreCategory: meta.label || "",
          points: meta.points !== undefined ? meta.points : 0,
          tags: result.tags,
          criticalFail: result.criticalFail
        });

        const logBox = document.getElementById("logBox");
        if (logBox) logBox.innerHTML += `<div style="color:green;">✅ Tagged ${key} as ${result.skillSheetID || "?"}</div>`;
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
      const meta = skillSheetScoring[result.skillSheetID] || {};
      const existing = await get(ref(db, `hardcodedResponses/${key}`));
      await set(ref(db, `hardcodedResponses/${key}`), {
        ...(existing.exists() ? existing.val() : {}),
        question,
        response,
        skillSheetID: result.skillSheetID || "",
        scoreCategory: meta.label || "",
        points: meta.points !== undefined ? meta.points : 0,
        tags: result.tags,
        criticalFail: result.criticalFail
      });

      logBox.innerHTML += `<div style="color:green;">✅ Updated approved ${key} — ${result.skillSheetID}</div>`;
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
      const meta = skillSheetScoring[result.skillSheetID] || {};
      await set(ref(db, `hardcodedReview/${key}`), {
        question,
        response,
        skillSheetID: result.skillSheetID || "",
        scoreCategory: meta.label || "",
        points: meta.points !== undefined ? meta.points : 0,
        tags: result.tags,
        criticalFail: result.criticalFail
      });

      logBox.innerHTML += `<div style="color:green;">✅ Updated review ${key} — ${result.skillSheetID}</div>`;
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

// ====== EXPORT FIREBASE AS DEDUPED JSON FILES ======
window.exportFirebaseToJSON = async function () {
  function normalizeQuestion(q) {
    return (q || "")
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/gi, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Collapse whitespace
  }
  const [snapApproved, snapReview] = await Promise.all([
    get(ref(db, "hardcodedResponses")),
    get(ref(db, "hardcodedReview"))
  ]);
  const approved = snapApproved.exists() ? snapApproved.val() : {};
  const review = snapReview.exists() ? snapReview.val() : {};

  const seen = new Set();
  const dedupedApproved = {};
  const dedupedReview = {};
  for (const [key, val] of Object.entries(approved)) {
    const norm = normalizeQuestion(val.question);
    if (!seen.has(norm)) {
      dedupedApproved[key] = val;
      seen.add(norm);
    }
  }
  for (const [key, val] of Object.entries(review)) {
    const norm = normalizeQuestion(val.question);
    if (!seen.has(norm)) {
      dedupedReview[key] = val;
      seen.add(norm);
    }
  }
  const all = { ...dedupedApproved, ...dedupedReview };
  const keys = Object.keys(all);
  const total = keys.length;
  const chunkSize = Math.ceil(total / 3);

  const chunk1 = {};
  const chunk2 = {};
  const chunk3 = {};
  keys.forEach((k, i) => {
    if (i < chunkSize) chunk1[k] = all[k];
    else if (i < 2 * chunkSize) chunk2[k] = all[k];
    else chunk3[k] = all[k];
  });

  function download(obj, filename) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  download(chunk1, "ems_database_part1.json");
  download(chunk2, "ems_database_part2.json");
  download(chunk3, "ems_database_part3.json");

  alert(`Exported ${total} unique entries across 3 JSON files!`);
};

// ========== JSON FILE EDIT/VIEW ==========
window.jsonEditData = null;
const jsonFileInput = document.getElementById("jsonFileInput");
const jsonEditContainer = document.getElementById("jsonEditContainer");
const downloadEditedJsonBtn = document.getElementById("downloadEditedJsonBtn");

if (jsonFileInput) {
  jsonFileInput.addEventListener("change", handleJsonFileSelect, false);
}

function handleJsonFileSelect(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      window.jsonEditData = JSON.parse(e.target.result);
      renderJsonEditUI(window.jsonEditData);
      downloadEditedJsonBtn.style.display = "inline-block";
    } catch (err) {
      alert("❌ Failed to parse JSON: " + err.message);
    }
  };
  reader.readAsText(file);
}

function renderJsonEditUI(jsonData) {
  jsonEditContainer.innerHTML = "";
  let entries = Array.isArray(jsonData)
    ? jsonData.map((val, idx) => [idx, val])
    : Object.entries(jsonData);

  entries.forEach(([key, val], i) => {
    const ssid = val.skillSheetID;
    const meta = skillSheetScoring[ssid] || {};
    const pointsDisplay = (meta.points !== undefined ? meta.points : (val.points !== undefined ? val.points : ""));
    const labelDisplay = meta.label || val.scoreCategory || "";

    const div = document.createElement("div");
    div.className = "response";
    div.innerHTML = `
      <div class="field"><strong>Key:</strong> <div contenteditable="false">${key}</div></div>
      <div class="field"><strong>Question:</strong> <div contenteditable="true" id="jq-${key}">${val.question || ""}</div></div>
      <div class="field"><strong>Response:</strong> <div contenteditable="true" id="jr-${key}">${val.response || val.answer || ""}</div></div>
      <div class="field"><strong>Skill Sheet ID:</strong> <div contenteditable="true" id="jsid-${key}">${ssid || ""}</div></div>
      <div class="field"><strong>Score Category:</strong> <div contenteditable="true" id="jcat-${key}">${labelDisplay}</div></div>
      <div class="field"><strong>Points:</strong> <div contenteditable="true" id="jpts-${key}">${pointsDisplay}</div></div>
      <div class="field"><strong>Critical Fail (true/false):</strong> <div contenteditable="true" id="jcf-${key}">${val.criticalFail !== undefined ? val.criticalFail : ""}</div></div>
      <div class="field"><strong>Role:</strong> <div contenteditable="true" id="jrole-${key}">${val.role || ""}</div></div>
      <div class="field"><strong>Tags:</strong> <div contenteditable="true" id="jtags-${key}">${Array.isArray(val.tags) ? val.tags.join(", ") : (val.tags || "")}</div></div>
      <div class="field"><strong>Trigger:</strong> <div contenteditable="true" id="jtrigger-${key}">${val.trigger || ""}</div></div>
      <button onclick="saveJsonEditEntry('${key}')">💾 Save Changes</button>
    `;
    jsonEditContainer.appendChild(div);
  });
}

// Save edits for a single entry
window.saveJsonEditEntry = function(key) {
  if (!window.jsonEditData) return;
  const get = id => document.getElementById(id)?.innerText.trim();

  const ssid = get(`jsid-${key}`);
  const meta = skillSheetScoring[ssid] || {};

  const entry = {
    question: get(`jq-${key}`),
    response: get(`jr-${key}`),
    skillSheetID: ssid,
    scoreCategory: meta.label || get(`jcat-${key}`),
    points: meta.points !== undefined ? meta.points : parseInt(get(`jpts-${key}`)) || 0,
    criticalFail: get(`jcf-${key}`) === "true",
    role: get(`jrole-${key}`),
    tags: get(`jtags-${key}`)?.split(",").map(t => t.trim()).filter(t => t),
    trigger: get(`jtrigger-${key}`)
  };
  let original = Array.isArray(window.jsonEditData)
    ? window.jsonEditData[key]
    : window.jsonEditData[key];
  window.jsonEditData[key] = { ...original, ...entry };
  alert(`💾 Saved changes to "${key}"!`);
}

window.downloadEditedJson = function() {
  if (!window.jsonEditData) return alert("No JSON loaded.");
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.jsonEditData, null, 2));
  const a = document.createElement('a');
  a.setAttribute("href", dataStr);
  a.setAttribute("download", "edited_ems_database.json");
  document.body.appendChild(a);
  a.click();
  a.remove();
};

// ======= Auto-Assign SkillSheetID With GPT and Set Points/Labels ==========
window.autoAssignSkillSheetIDWithGPT = async function () {
  const snap = await get(ref(db, "hardcodedResponses"));
  if (!snap.exists()) {
    alert("No approved entries found.");
    return;
  }
  const data = snap.val();
  let updatedCount = 0;
  let failCount = 0;

  if (window.logBox) window.logBox.innerHTML = "";

  for (const [key, entry] of Object.entries(data)) {
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
      if (res.ok && result.skillSheetID && result.skillSheetID !== "none") {
        const meta = skillSheetScoring[result.skillSheetID] || {};
        await set(ref(db, `hardcodedResponses/${key}/skillSheetID`), result.skillSheetID);
        await set(ref(db, `hardcodedResponses/${key}/scoreCategory`), meta.label || "");
        await set(ref(db, `hardcodedResponses/${key}/points`), meta.points !== undefined ? meta.points : 0);
        updatedCount++;
        if (window.logBox) logBox.innerHTML += `<div style="color:green;">${key}: ${result.skillSheetID} (${meta.label || ''}, ${meta.points || 0}pt)</div>`;
      } else {
        failCount++;
        if (window.logBox) logBox.innerHTML += `<div style="color:red;">${key}: No valid skillSheetID [${result.raw || ''}]</div>`;
        console.warn(`GPT did not return a valid skillSheetID for key: ${key}`, result);
      }
    } catch (err) {
      failCount++;
      if (window.logBox) logBox.innerHTML += `<div style="color:red;">${key}: Error calling GPT</div>`;
      console.warn(`Error assigning skillSheetID for ${key}`, err);
    }
  }
  alert(`Auto-assigned skillSheetID, scoreCategory, and points for ${updatedCount} responses. Failed for ${failCount}.`);
  location.reload();
};

