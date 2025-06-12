window.jsonEditData = {};
const filePathInput = document.getElementById("filePathInput");
const loadPathBtn = document.getElementById("loadPathBtn");
const jsonFileInput = document.getElementById("jsonFileInput");
const logBox = document.getElementById("logBox");
const responsesContainer = document.getElementById("responsesContainer");
const downloadEditedJsonBtn = document.getElementById("downloadEditedJsonBtn");
const bulkAssignBtn = document.getElementById("bulkAssignBtn");
const convertLegacyBtn = document.getElementById("convertLegacyBtn");

// --- Event listeners ---
if (loadPathBtn) loadPathBtn.addEventListener("click", loadJsonFromPath);
if (jsonFileInput) jsonFileInput.addEventListener("change", handleJsonFileSelect);
if (downloadEditedJsonBtn) downloadEditedJsonBtn.addEventListener("click", downloadEditedJson);
if (bulkAssignBtn) bulkAssignBtn.addEventListener("click", bulkAssignPointsLabels);
if (convertLegacyBtn) convertLegacyBtn.addEventListener("click", convertLegacySkillSheetIDs);

async function loadJsonFromPath() {
  const filePath = filePathInput.value.trim();
  if (!filePath) {
    logBox.innerText = "Please enter a file path (e.g. /ems_database.json)";
    responsesContainer.innerText = "";
    return;
  }
  logBox.innerText = "Loading...";
  responsesContainer.innerText = "";
  try {
    const resp = await fetch(filePath, {cache: "reload"});
    if (!resp.ok) throw new Error(`Could not fetch file: ${filePath} (${resp.status})`);
    const json = await resp.json();
    window.jsonEditData = json;
    renderAllJsonEntries(window.jsonEditData);
    downloadEditedJsonBtn.style.display = "inline-block";
    bulkAssignBtn.style.display = "inline-block";
    convertLegacyBtn.style.display = "inline-block";
    logBox.innerText = `Loaded file: ${filePath}`;
  } catch (err) {
    logBox.innerText = "❌ " + err.message;
    responsesContainer.innerText = "";
    window.jsonEditData = {};
    downloadEditedJsonBtn.style.display = "none";
    bulkAssignBtn.style.display = "none";
    convertLegacyBtn.style.display = "none";
  }
}

function handleJsonFileSelect(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  logBox.innerText = "Reading file...";
  responsesContainer.innerText = "";
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      window.jsonEditData = JSON.parse(e.target.result);
      renderAllJsonEntries(window.jsonEditData);
      downloadEditedJsonBtn.style.display = "inline-block";
      bulkAssignBtn.style.display = "inline-block";
      convertLegacyBtn.style.display = "inline-block";
      logBox.innerText = "JSON file loaded from disk.";
    } catch (err) {
      logBox.innerText = "❌ Failed to parse JSON: " + err.message;
      responsesContainer.innerText = "";
      window.jsonEditData = {};
      downloadEditedJsonBtn.style.display = "none";
      bulkAssignBtn.style.display = "none";
      convertLegacyBtn.style.display = "none";
    }
  };
  reader.readAsText(file);
}

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
  const meta = (window.skillSheetScoring || {})[ssid] || {};
  const pointsDisplay = (meta.points !== undefined ? meta.points : (data.points !== undefined ? data.points : ""));
  const labelDisplay = meta.label || data.scoreCategory || "";
  const div = document.createElement("div");
  div.className = "response";
  div.innerHTML = `
    <div class="row">
      <div class="field"><label>Key:</label><input type="text" value="${key}" disabled></div>
      <div class="field"><label>Skill Sheet ID:</label><input type="text" id="skillSheetID-${key}" value="${ssid || ""}" onchange="onSkillSheetIDEdit('${key}')"></div>
      <div class="field"><label>Score Category:</label><input type="text" id="cat-${key}" value="${labelDisplay}"></div>
      <div class="field"><label>Points:</label><input type="text" id="pts-${key}" value="${pointsDisplay}"></div>
      <div class="field"><label>Critical Fail:</label><input type="text" id="cf-${key}" value="${data.criticalFail !== undefined ? data.criticalFail : ""}"></div>
      <div class="field"><label>Role:</label><input type="text" id="role-${key}" value="${data.role || ""}"></div>
    </div>
    <div class="field"><label>Question:</label><textarea id="q-${key}" rows="2">${data.question || ""}</textarea></div>
    <div class="field"><label>Response:</label><textarea id="r-${key}" rows="2">${data.response || data.answer || ""}</textarea></div>
    <div class="field"><label>Tags:</label><input type="text" id="tags-${key}" value="${Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "")}"></div>
    <div class="field"><label>Trigger:</label><input type="text" id="trigger-${key}" value="${data.trigger || ""}"></div>
    <button class="btn" onclick="saveJsonEditEntry('${key}')">💾 Save</button>
    <button class="btn" onclick="deleteJsonEntry('${key}')">🗑 Delete</button>
  `;
  responsesContainer.appendChild(div);
}

window.saveJsonEditEntry = function(key) {
  if (!window.jsonEditData) return;
  const get = id => document.getElementById(id)?.value.trim();
  const ssid = get(`skillSheetID-${key}`);
  const meta = (window.skillSheetScoring || {})[ssid] || {};
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

function downloadEditedJson() {
  if (!window.jsonEditData) return alert("No JSON loaded.");
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.jsonEditData, null, 2));
  const a = document.createElement('a');
  a.setAttribute("href", dataStr);
  a.setAttribute("download", "edited_ems_database.json");
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function bulkAssignPointsLabels() {
  if (!window.jsonEditData) return alert("No JSON loaded.");
  let count = 0, missing = [];
  let entries = Array.isArray(window.jsonEditData)
    ? window.jsonEditData.map((val, idx) => [idx, val])
    : Object.entries(window.jsonEditData);
  entries.forEach(([key, entry]) => {
    const ssid = entry.skillSheetID;
    const meta = (window.skillSheetScoring || {})[ssid];
    if (ssid) {
      if (meta && meta.points !== undefined) {
        entry.scoreCategory = meta.label;
        entry.points = meta.points;
        count++;
      } else {
        missing.push(ssid);
      }
    }
  });
  renderAllJsonEntries(window.jsonEditData);
  if (missing.length)
    alert(`⚠️ Not found in skill sheet: ${[...new Set(missing)].join(', ')}`);
  else
    alert(`⭐ Updated ${count} entries with skill sheet points and labels.`);
}

window.onSkillSheetIDEdit = function(key) {
  const ssid = document.getElementById(`skillSheetID-${key}`).value.trim();
  const meta = (window.skillSheetScoring || {})[ssid] || {};
  if (meta.label !== undefined) document.getElementById(`cat-${key}`).value = meta.label;
  if (meta.points !== undefined) document.getElementById(`pts-${key}`).value = meta.points;
};

// ---- Legacy conversion (aggregate IDs to granular IDs) ----
function convertLegacySkillSheetIDs() {
  if (!window.jsonEditData) return alert("No JSON loaded.");
  const legacyToGranular = {
    obtainsSAMPLEHistory: [
      "sampleSigns", "sampleAllergies", "sampleMedications",
      "samplePastHistory", "sampleLastIntake", "sampleEvents"
    ],
    obtainsOPQRSTHistory: [
      "opqrstOnset", "opqrstProvocation", "opqrstQuality",
      "opqrstRadiation", "opqrstSeverity", "opqrstTime"
    ]
    // Add other legacy keys as needed
  };
  let newEntries = {};
  let converted = 0, kept = 0;
  Object.entries(window.jsonEditData).forEach(([key, entry]) => {
    if (legacyToGranular[entry.skillSheetID]) {
      legacyToGranular[entry.skillSheetID].forEach((granularID, i) => {
        const newKey = key + "_" + granularID;
        newEntries[newKey] = { ...entry, skillSheetID: granularID };
        converted++;
      });
    } else {
      newEntries[key] = entry;
      kept++;
    }
  });
  window.jsonEditData = newEntries;
  alert(`Converted ${converted} legacy IDs to granular. Kept ${kept} unchanged. Click Download to save.`);
  renderAllJsonEntries(window.jsonEditData);
}
