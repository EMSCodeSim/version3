// admin_home.js

window.jsonEditData = {};
const filePathInput = document.getElementById("filePathInput");
const loadPathBtn = document.getElementById("loadPathBtn");
const jsonFileInput = document.getElementById("jsonFileInput");
const logBox = document.getElementById("logBox");
const responsesContainer = document.getElementById("responsesContainer");
const downloadEditedJsonBtn = document.getElementById("downloadEditedJsonBtn");
const bulkAssignBtn = document.getElementById("bulkAssignBtn");
const convertLegacyBtn = document.getElementById("convertLegacyBtn");

// NEW: Dedupe & Remap button
let dedupeRemapBtn = document.getElementById("dedupeRemapBtn");
if (!dedupeRemapBtn) {
  dedupeRemapBtn = document.createElement("button");
  dedupeRemapBtn.id = "dedupeRemapBtn";
  dedupeRemapBtn.className = "btn";
  dedupeRemapBtn.textContent = "Dedupe & Remap SkillSheet ID";
  dedupeRemapBtn.style.marginBottom = "8px";
  responsesContainer?.parentNode?.insertBefore(dedupeRemapBtn, responsesContainer);
}
dedupeRemapBtn.onclick = dedupeAndRemapSkillSheetID;

window.availableScenarioFiles = [];

if (loadPathBtn) loadPathBtn.addEventListener("click", loadJsonFromPath);
if (jsonFileInput) jsonFileInput.addEventListener("change", handleJsonFileSelect);
if (downloadEditedJsonBtn) downloadEditedJsonBtn.addEventListener("click", downloadEditedJson);
if (bulkAssignBtn) bulkAssignBtn.addEventListener("click", bulkAssignPointsLabels);
if (convertLegacyBtn) convertLegacyBtn.addEventListener("click", convertLegacySkillSheetIDs);

function getScenarioFolderFromPath(path) {
  if (!path) return "";
  let lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return "";
  let folder = path.substring(0, lastSlash + 1);
  if (!folder.startsWith("/")) folder = "/" + folder;
  if (!folder.endsWith("/")) folder = folder + "/";
  return folder;
}

async function getAvailableFiles(scenarioFolder) {
  let manifestPath = scenarioFolder + "files.json";
  try {
    let resp = await fetch(manifestPath, {cache: "reload"});
    if (resp.ok) {
      let files = await resp.json();
      if (Array.isArray(files)) return files;
    }
  } catch (e) {}
  try {
    let resp = await fetch(scenarioFolder, {cache: "reload"});
    if (!resp.ok) return [];
    let text = await resp.text();
    let matches = [...text.matchAll(/href="([^"]+\.(jpe?g|png|gif|mp3|wav|m4a|ogg))"/gi)];
    return matches.map(m => m[1]);
  } catch (e) {}
  return [];
}

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
    const scenarioFolder = getScenarioFolderFromPath(filePath);
    window.availableScenarioFiles = await getAvailableFiles(scenarioFolder);
    renderAllJsonEntries(window.jsonEditData);
    downloadEditedJsonBtn.style.display = "inline-block";
    bulkAssignBtn.style.display = "inline-block";
    convertLegacyBtn.style.display = "inline-block";
    dedupeRemapBtn.style.display = "inline-block";
    logBox.innerText = `Loaded file: ${filePath}`;
  } catch (err) {
    logBox.innerText = "❌ " + err.message;
    responsesContainer.innerText = "";
    window.jsonEditData = {};
    downloadEditedJsonBtn.style.display = "none";
    bulkAssignBtn.style.display = "none";
    convertLegacyBtn.style.display = "none";
    dedupeRemapBtn.style.display = "none";
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
      window.availableScenarioFiles = [];
      renderAllJsonEntries(window.jsonEditData);
      downloadEditedJsonBtn.style.display = "inline-block";
      bulkAssignBtn.style.display = "inline-block";
      convertLegacyBtn.style.display = "inline-block";
      dedupeRemapBtn.style.display = "inline-block";
      logBox.innerText = "JSON file loaded from disk.";
    } catch (err) {
      logBox.innerText = "❌ Failed to parse JSON: " + err.message;
      responsesContainer.innerText = "";
      window.jsonEditData = {};
      downloadEditedJsonBtn.style.display = "none";
      bulkAssignBtn.style.display = "none";
      convertLegacyBtn.style.display = "none";
      dedupeRemapBtn.style.display = "none";
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
  const files = window.availableScenarioFiles || [];
  let triggerOptions = files.map(f => `<option value="${f}"${data.trigger === f ? " selected" : ""}>${f}</option>`).join('');
  if (data.trigger && files.indexOf(data.trigger) === -1) {
    triggerOptions = `<option value="${data.trigger}" selected>${data.trigger}</option>` + triggerOptions;
  }
  triggerOptions = `<option value=""></option>` + triggerOptions;

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
    <div class="field">
      <label>Trigger:</label>
      <select id="trigger-${key}">${triggerOptions}</select>
      <input type="text" id="trigger-manual-${key}" placeholder="or enter manually" style="width: 60%; display:inline-block; margin-left: 6px;" value="">
      <button class="btn" type="button" onclick="setManualTrigger('${key}')">Set</button>
    </div>
    <button class="btn" onclick="saveJsonEditEntry('${key}')">💾 Save</button>
    <button class="btn" onclick="deleteJsonEntry('${key}')">🗑 Delete</button>
  `;
  responsesContainer.appendChild(div);
}

window.setManualTrigger = function(key) {
  const manualInput = document.getElementById(`trigger-manual-${key}`);
  const select = document.getElementById(`trigger-${key}`);
  if (manualInput && select) {
    if (manualInput.value.trim()) {
      let opt = document.createElement("option");
      opt.value = manualInput.value.trim();
      opt.textContent = manualInput.value.trim();
      opt.selected = true;
      select.appendChild(opt);
      select.value = manualInput.value.trim();
      manualInput.value = "";
    }
  }
};

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
  };
  let newEntries = {};
  let keyMap = {};
  let converted = 0, kept = 0, skipped = 0;
  Object.entries(window.jsonEditData).forEach(([key, entry]) => {
    if (legacyToGranular[entry.skillSheetID]) {
      legacyToGranular[entry.skillSheetID].forEach((granularID) => {
        let uniq = (entry.question || "") + "|" + granularID;
        if (!keyMap[uniq]) {
          let newKey = key + "_" + granularID;
          newEntries[newKey] = { ...entry, skillSheetID: granularID };
          keyMap[uniq] = true;
          converted++;
        } else {
          skipped++;
        }
      });
    } else {
      let uniq = (entry.question || "") + "|" + entry.skillSheetID;
      if (!keyMap[uniq]) {
        newEntries[key] = entry;
        keyMap[uniq] = true;
        kept++;
      } else {
        skipped++;
      }
    }
  });
  window.jsonEditData = newEntries;
  alert(`Converted ${converted} legacy IDs, kept ${kept} unique, skipped ${skipped} duplicate entries. Click Download to save.`);
  renderAllJsonEntries(window.jsonEditData);
}

// === Dedupe & Remap SkillSheet ID ===
function dedupeAndRemapSkillSheetID() {
  if (!window.jsonEditData) return alert("No JSON loaded.");

  // Keyword mapping for best effort auto-mapping
  const keywordToSkillSheetID = [
    { id: "ppeBsi", kws: ["bsi", "ppe", "gloves", "body substance"] },
    { id: "sceneSafety", kws: ["scene safe", "scene secure", "hazard", "scene safety"] },
    { id: "determinesMOIorNOI", kws: ["moi", "noi", "mechanism", "nature of illness"] },
    { id: "determinesNumberOfPatients", kws: ["how many patients", "number of patients"] },
    { id: "requestsAdditionalResources", kws: ["als", "additional resource", "call backup"] },
    { id: "considersCSpine", kws: ["c-spine", "spinal", "stabilize spine"] },
    { id: "generalImpression", kws: ["general impression", "sick or not sick", "looks ill"] },
    { id: "determinesResponsiveness", kws: ["avpu", "responsive", "alert", "verbal", "pain", "unresponsive"] },
    { id: "chiefComplaint", kws: ["chief complaint", "what happened", "what's wrong"] },
    { id: "airway", kws: ["airway", "patent airway", "open airway", "breathing"] },
    { id: "oxygenTherapy", kws: ["oxygen", "o2", "non-rebreather", "nasal cannula"] },
    { id: "circulation", kws: ["pulse", "circulation", "bleeding", "skin sign", "capillary refill"] },
    { id: "patientPriority", kws: ["transport", "load and go", "priority", "emergent"] },
    { id: "opqrstOnset", kws: ["when did it start", "onset"] },
    { id: "opqrstProvocation", kws: ["what makes it better", "what makes it worse", "provocation"] },
    { id: "opqrstQuality", kws: ["sharp", "dull", "stabbing", "aching", "quality"] },
    { id: "opqrstRadiation", kws: ["does it move", "radiate", "spreads"] },
    { id: "opqrstSeverity", kws: ["how bad", "scale 1 to 10", "severity"] },
    { id: "opqrstTime", kws: ["how long", "duration", "started when"] },
    { id: "sampleSigns", kws: ["associated symptoms", "signs", "other symptoms"] },
    { id: "sampleAllergies", kws: ["allergies", "allergic"] },
    { id: "sampleMedications", kws: ["medications", "meds", "taking any meds"] },
    { id: "samplePastHistory", kws: ["history", "diagnosed", "past problems"] },
    { id: "sampleLastIntake", kws: ["last ate", "last drink", "oral intake"] },
    { id: "sampleEvents", kws: ["leading up", "what were you doing", "events"] },
    { id: "assessesAffectedBodyPart", kws: ["head to toe", "secondary assessment", "focused exam"] },
    { id: "obtainsBaselineVitalsBP", kws: ["blood pressure", "bp"] },
    { id: "obtainsBaselineVitalsHR", kws: ["heart rate", "hr"] },
    { id: "obtainsBaselineVitalsRR", kws: ["respiratory rate", "rr", "breathing quality"] },
    { id: "fieldImpression", kws: ["field impression", "i think"] },
    { id: "managesSecondaryInjuries", kws: ["treatment plan", "interventions", "doing now"] },
    { id: "verbalizesReassessment", kws: ["reevaluate", "recheck", "repeat vitals"] }
  ];

  function normalize(str) {
    return (str || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function guessSkillID(question) {
    const q = normalize(question);
    for (const entry of keywordToSkillSheetID) {
      for (const kw of entry.kws) {
        if (q.includes(kw)) return entry.id;
      }
    }
    return ""; // fallback if not matched
  }

  // Deduplicate by question text (ignore case/space)
  let seenQuestions = new Set();
  let cleaned = {};
  Object.entries(window.jsonEditData).forEach(([key, entry]) => {
    const normQ = normalize(entry.question);
    if (normQ && !seenQuestions.has(normQ)) {
      cleaned[key] = entry;
      seenQuestions.add(normQ);
    }
  });
  window.jsonEditData = cleaned;

  // Auto-map every skillSheetID based on question
  Object.values(window.jsonEditData).forEach(entry => {
    const guessed = guessSkillID(entry.question);
    if (guessed) entry.skillSheetID = guessed;
  });

  alert("Deduplicated and updated skillSheetID for all entries! Review, then Download.");
  renderAllJsonEntries(window.jsonEditData);
}
