import { skillSheetScoring } from './grading_skill_sheet.js';

// DOM Elements
window.jsonEditData = {};
const jsonFileInput = document.getElementById("jsonFileInput");
const filePathInput = document.getElementById("filePathInput");
const loadPathBtn = document.getElementById("loadPathBtn");
const downloadEditedJsonBtn = document.getElementById("downloadEditedJsonBtn");
const responsesContainer = document.getElementById("responsesContainer");
const logBox = document.getElementById("logBox");

// ====== LOAD JSON FROM PATH (Netlify/public) ======
window.loadJsonFromPath = async function() {
  const filePath = filePathInput.value.trim();
  if (!filePath) {
    alert("Please enter a file path (e.g. /ems_database.json)");
    return;
  }
  logBox.innerText = "Loading...";
  try {
    // Only allow same-origin fetch
    const resp = await fetch(filePath, {cache: "reload"});
    if (!resp.ok) throw new Error(`Could not fetch file: ${filePath} (${resp.status})`);
    const json = await resp.json();
    window.jsonEditData = json;
    renderAllJsonEntries(window.jsonEditData);
    downloadEditedJsonBtn.style.display = "inline-block";
    logBox.innerText = `Loaded file: ${filePath}`;
  } catch (err) {
    logBox.innerText = "❌ " + err.message;
    responsesContainer.innerHTML = "";
    window.jsonEditData = {};
  }
};

// ====== LOAD JSON FROM UPLOADED FILE ======
if (jsonFileInput) {
  jsonFileInput.addEventListener("change", function(evt) {
    const file = evt.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        window.jsonEditData = JSON.parse(e.target.result);
        renderAllJsonEntries(window.jsonEditData);
        downloadEditedJsonBtn.style.display = "inline-block";
        logBox.innerText = "JSON file loaded from disk.";
      } catch (err) {
        logBox.innerText = "❌ Failed to parse JSON: " + err.message;
        responsesContainer.innerHTML = "";
        window.jsonEditData = {};
      }
    };
    reader.readAsText(file);
  });
}

// ====== RENDER ======
function renderAllJsonEntries(jsonData) {
  responsesContainer.innerHTML = "";
  let entries = Array.isArray(jsonData)
    ? jsonData.map((val, idx) => [idx, val])
    : Object.entries(jsonData);
  if (entries.length === 0) {
    responsesContainer.innerHTML = "<div>No entries found in file.</div>";
    return;
  }
  entries.forEach(([key, val]) => renderResponseCard(key, val));
}

function renderResponseCard(key, data) {
  const ssid = data.skillSheetID;
  const meta = skillSheetScoring[ssid] || {};
  const pointsDisplay = (meta.points !== undefined ? meta.points : (data.points !== undefined ? data.points : ""));
  const labelDisplay = meta.label || data.scoreCategory || "";
  const div = document.createElement("div");
  div.className = "response";
  div.innerHTML = `
    <div class="field"><strong>Key:</strong> <div contenteditable="false">${key}</div></div>
    <div class="field"><strong>Question:</strong> <div contenteditable="true" id="q-${key}">${data.question || ""}</div></div>
    <div class="field"><strong>Response:</strong> <div contenteditable="true" id="r-${key}">${data.response || data.answer || ""}</div></div>
    <div class="field"><strong>Skill Sheet ID:</strong> <div contenteditable="true" id="skillSheetID-${key}">${ssid || ""}</div></div>
    <div class="field"><strong>Score Category:</strong> <div contenteditable="true" id="cat-${key}">${labelDisplay}</div></div>
    <div class="field"><strong>Points:</strong> <div contenteditable="true" id="pts-${key}">${pointsDisplay}</div></div>
    <div class="field"><strong>Critical Fail (true/false):</strong> <div contenteditable="true" id="cf-${key}">${data.criticalFail !== undefined ? data.criticalFail : ""}</div></div>
    <div class="field"><strong>Role:</strong> <div contenteditable="true" id="role-${key}">${data.role || ""}</div></div>
    <div class="field"><strong>Tags:</strong> <div contenteditable="true" id="tags-${key}">${Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "")}</div></div>
    <div class="field"><strong>Trigger:</strong> <div contenteditable="true" id="trigger-${key}">${data.trigger || ""}</div></div>
    <button onclick="saveJsonEditEntry('${key}')">💾 Save</button>
    <button onclick="deleteJsonEntry('${key}')">🗑 Delete</button>
  `;
  responsesContainer.appendChild(div);
}

// ====== SAVE/DELETE/EXPORT/ETC (same as before) ======
window.saveJsonEditEntry = function(key) {
  if (!window.jsonEditData) return;
  const get = id => document.getElementById(id)?.innerText.trim();
  const ssid = get(`skillSheetID-${key}`);
  const meta = skillSheetScoring[ssid] || {};
  const entry = {
    question: get(`q-${key}`),
    response: get(`r-${key}`),
    skillSheetID: ssid,
    scoreCategory: meta.label || get(`cat-${key}`),
    points: meta.points !== undefined ? meta.points : parseInt(get(`pts-${key}`)) || 0,
    criticalFail: get(`cf-${key}`) === "true",
    role: get(`role-${key}`),
    tags: get(`tags-${key}`)?.split(",").map(t => t.trim()).filter(t => t),
    trigger: get(`trigger-${key}`)
  };
  if (Array.isArray(window.jsonEditData)) {
    window.jsonEditData[key] = { ...window.jsonEditData[key], ...entry };
  } else {
    window.jsonEditData[key] = { ...window.jsonEditData[key], ...entry };
  }
  alert(`💾 Saved changes to "${key}"!`);
};

window.deleteJsonEntry = function(key) {
  if (!window.jsonEditData) return;
  if (!confirm(`Delete entry "${key}"?`)) return;
  if (Array.isArray(window.jsonEditData)) {
    window.jsonEditData.splice(key, 1);
  } else {
    delete window.jsonEditData[key];
  }
  renderAllJsonEntries(window.jsonEditData);
  alert(`🗑 Deleted "${key}".`);
};

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

window.bulkAssignPointsLabels = function() {
  if (!window.jsonEditData) return alert("No JSON loaded.");
  let count = 0;
  let entries = Array.isArray(window.jsonEditData)
    ? window.jsonEditData.map((val, idx) => [idx, val])
    : Object.entries(window.jsonEditData);
  entries.forEach(([key, entry]) => {
    const ssid = entry.skillSheetID;
    const meta = skillSheetScoring[ssid] || {};
    if (ssid && meta.points !== undefined) {
      entry.scoreCategory = meta.label;
      entry.points = meta.points;
      count++;
    }
  });
  renderAllJsonEntries(window.jsonEditData);
  alert(`⭐ Updated ${count} entries with skill sheet points and labels.`);
};

window.filterJsonEntries = function() {
  const filterVal = document.getElementById("filterInput").value.toLowerCase();
  if (!window.jsonEditData) return;
  let entries = Array.isArray(window.jsonEditData)
    ? window.jsonEditData.map((val, idx) => [idx, val])
    : Object.entries(window.jsonEditData);
  const filtered = entries.filter(([key, val]) =>
    (val.question || "").toLowerCase().includes(filterVal) ||
    (val.response || "").toLowerCase().includes(filterVal) ||
    (val.skillSheetID || "").toLowerCase().includes(filterVal)
  );
  responsesContainer.innerHTML = "";
  filtered.forEach(([key, val]) => renderResponseCard(key, val));
};

// ====== Optionally, add a sample loader for testing ======
window.loadSampleJson = function() {
  fetch('ems_database_sample.json')
    .then(r => r.json())
    .then(json => {
      window.jsonEditData = json;
      renderAllJsonEntries(window.jsonEditData);
      downloadEditedJsonBtn.style.display = "inline-block";
      logBox.innerText = "Sample JSON loaded.";
    })
    .catch(() => { logBox.innerText = "Could not load sample JSON."; });
};
