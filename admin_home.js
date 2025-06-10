import { skillSheetScoring } from './grading_skill_sheet.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get, set, remove, update } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// ...[all your mapping tables, Firebase config, UI logic, etc. unchanged]...

// ======= BULK UPDATE: Assign Points & Labels from Skill Sheet =======
window.bulkAssignPointsLabels = async function() {
  const snap = await get(ref(db, "hardcodedResponses"));
  if (!snap.exists()) return alert("No approved entries found.");
  const data = snap.val();
  const updates = {};

  for (const [key, entry] of Object.entries(data)) {
    const ssid = entry.skillSheetID;
    const meta = skillSheetScoring[ssid] || {};
    if (ssid && meta.points !== undefined) {
      updates[`hardcodedResponses/${key}/scoreCategory`] = meta.label;
      updates[`hardcodedResponses/${key}/points`] = meta.points;
    }
  }
  if (Object.keys(updates).length) {
    await update(ref(db), updates);
    alert(`✅ Updated ${Object.keys(updates).length} entries with skill sheet points and labels.`);
    location.reload();
  } else {
    alert("No updates made. Ensure responses have skillSheetID fields that match the grading map.");
  }
};

// (You can add a button in your HTML: <button onclick="bulkAssignPointsLabels()">⭐ Update Points & Labels</button> )

// ====== When Saving/Tagging, Always Assign Points/Label Automatically ======
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

  // ...TTS logic unchanged...
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

// ...[rest of your admin logic unchanged]...
