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

// --- NEW: Dedupe & GPT Auto-Tag SkillSheet IDs ---
let dedupeGptBtn = document.getElementById("dedupeGptBtn");
if (!dedupeGptBtn) {
  dedupeGptBtn = document.createElement("button");
  dedupeGptBtn.id = "dedupeGptBtn";
  dedupeGptBtn.className = "btn";
  dedupeGptBtn.textContent = "Dedupe & GPT Auto-Tag SkillSheet IDs";
  dedupeGptBtn.style.marginBottom = "8px";
  if (responsesContainer?.parentNode) {
    responsesContainer.parentNode.insertBefore(dedupeGptBtn, responsesContainer);
  }
}
dedupeGptBtn.onclick = dedupeAndGptAutoTag;

// --- NEW: Auto-Tag SkillSheetID & Tags Only ---
let autoTagBtn = document.getElementById("autoTagBtn");
if (!autoTagBtn) {
  autoTagBtn = document.createElement("button");
  autoTagBtn.id = "autoTagBtn";
  autoTagBtn.className = "btn";
  autoTagBtn.textContent = "Auto-Tag SkillSheetID & Tags";
  autoTagBtn.style.marginBottom = "8px";
  if (responsesContainer?.parentNode) {
    responsesContainer.parentNode.insertBefore(autoTagBtn, responsesContainer);
  }
}
autoTagBtn.onclick = autoTagSkillSheetAndTags;

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
    dedupeGptBtn.style.display = "inline-block";
    autoTagBtn.style.display = "inline-block";
    logBox.innerText = `Loaded file: ${filePath}`;
  } catch (err) {
    logBox.innerText = "❌ " + err.message;
    responsesContainer.innerText = "";
    window.jsonEditData = {};
    downloadEditedJsonBtn.style.display = "none";
    bulkAssignBtn.style.display = "none";
    convertLegacyBtn.style.display = "none";
    dedupeGptBtn.style.display = "none";
    autoTagBtn.style.display = "none";
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
      dedupeGptBtn.style.display = "inline-block";
      autoTagBtn.style.display = "inline-block";
      logBox.innerText = "JSON file loaded from disk.";
    } catch (err) {
      logBox.innerText = "❌ Failed to parse JSON: " + err.message;
      responsesContainer.innerText = "";
      window.jsonEditData = {};
      downloadEditedJsonBtn.style.display = "none";
      bulkAssignBtn.style.display = "none";
      convertLegacyBtn.style.display = "none";
      dedupeGptBtn.style.display = "none";
      autoTagBtn.style.display = "none";
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

// === Deduplicate then GPT-4 Turbo Skill Sheet ID Auto-Tag ===
async function dedupeAndGptAutoTag() {
  if (!window.jsonEditData) return alert("No JSON loaded.");

  // 1. Deduplicate by normalized question text
  function normalize(str) {
    return (str || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }
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
  renderAllJsonEntries(window.jsonEditData);

  // 2. GPT-4 Turbo tagging
  const SKILL_IDS = [
    "ppeBsi", "sceneSafety", "determinesMOIorNOI", "determinesNumberOfPatients", "requestsAdditionalResources", "considersCSpine",
    "generalImpression", "determinesResponsiveness", "chiefComplaint", "airway", "oxygenTherapy", "circulation", "patientPriority",
    "opqrstOnset", "opqrstProvocation", "opqrstQuality", "opqrstRadiation", "opqrstSeverity", "opqrstTime", "sampleSigns",
    "sampleAllergies", "sampleMedications", "samplePastHistory", "sampleLastIntake", "sampleEvents", "assessesAffectedBodyPart",
    "obtainsBaselineVitalsBP", "obtainsBaselineVitalsHR", "obtainsBaselineVitalsRR", "fieldImpression", "managesSecondaryInjuries", "verbalizesReassessment"
  ];

  if (!window.openaiApiKey) {
    window.openaiApiKey = prompt("Enter your OpenAI API Key (will NOT be sent anywhere except OpenAI):", "");
    if (!window.openaiApiKey) return alert("API key required.");
  }

  let entries = Array.isArray(window.jsonEditData)
    ? window.jsonEditData.map((val, idx) => [idx, val])
    : Object.entries(window.jsonEditData);

  let total = entries.length, done = 0;
  let proceed = confirm(`Deduped. Now auto-tag ALL (${total}) entries with GPT-4 Turbo? This may use OpenAI credits.`);
  if (!proceed) return;

  logBox.innerText = "Deduped. GPT auto-tagging in progress...";

  for (const [key, entry] of entries) {
    let question = entry.question || entry.prompt || "";
    if (!question.trim()) continue;

    let prompt = `
You are an EMS educator. From the following list of NREMT Medical Assessment Skill Sheet IDs, pick the **single best matching ID** for this question:

Skill Sheet IDs: ${SKILL_IDS.join(", ")}

Question: "${question}"

Return ONLY the Skill Sheet ID, nothing else.`;

    try {
      let resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + window.openaiApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages: [
            { role: "system", content: "You are an EMS educator and NREMT instructor." },
            { role: "user", content: prompt }
          ],
          max_tokens: 15,
          temperature: 0
        })
      });
      let data = await resp.json();
      let answer = data.choices && data.choices[0]?.message?.content?.trim().split(/\s/)[0];
      if (SKILL_IDS.includes(answer)) {
        entry.skillSheetID = answer;
      } else {
        entry.skillSheetID = "";
        console.warn(`GPT response not in list: "${answer}"\nQ: ${question}`);
      }
    } catch (err) {
      entry.skillSheetID = "";
      console.error("GPT error:", err);
    }

    done++;
    if (done % 10 === 0) {
      logBox.innerText = `Deduped and GPT auto-tagged ${done}/${total}...`;
    }
    await new Promise(r => setTimeout(r, 700));
  }
  renderAllJsonEntries(window.jsonEditData);
  logBox.innerText = "✅ Deduped & GPT auto-tagging complete! Review then Download.";
  alert("Done! Review your entries and download.");
}

// === Auto-Tag SkillSheetID & Tags (Non-destructive to Q/A) ===
async function autoTagSkillSheetAndTags() {
  if (!window.jsonEditData) return alert("No JSON loaded.");

  const SKILL_IDS = [
    "ppeBsi", "sceneSafety", "determinesMOIorNOI", "determinesNumberOfPatients", "requestsAdditionalResources", "considersCSpine",
    "generalImpression", "determinesResponsiveness", "chiefComplaint", "airway", "oxygenTherapy", "circulation", "patientPriority",
    "opqrstOnset", "opqrstProvocation", "opqrstQuality", "opqrstRadiation", "opqrstSeverity", "opqrstTime", "sampleSigns",
    "sampleAllergies", "sampleMedications", "samplePastHistory", "sampleLastIntake", "sampleEvents", "assessesAffectedBodyPart",
    "obtainsBaselineVitalsBP", "obtainsBaselineVitalsHR", "obtainsBaselineVitalsRR", "fieldImpression", "managesSecondaryInjuries", "verbalizesReassessment"
  ];

  if (!window.openaiApiKey) {
    window.openaiApiKey = prompt("Enter your OpenAI API Key (will NOT be sent anywhere except OpenAI):", "");
    if (!window.openaiApiKey) return alert("API key required.");
  }

  let entries = Array.isArray(window.jsonEditData)
    ? window.jsonEditData.map((val, idx) => [idx, val])
    : Object.entries(window.jsonEditData);

  let total = entries.length, done = 0;
  let proceed = confirm(`Auto-tag ALL (${total}) entries with GPT-4 Turbo? This will use OpenAI credits.`);
  if (!proceed) return;

  logBox.innerText = "Auto-tagging in progress...";

  for (const [key, entry] of entries) {
    let question = entry.question || entry.prompt || "";
    if (!question.trim()) continue;

    // Only fill skillSheetID if blank or missing
    let prompt = `
You are an EMS educator and NREMT instructor.
From this list: ${SKILL_IDS.join(", ")}
Pick the **single best matching Skill Sheet ID** for the question below.
Also, return 3 to 6 comma-separated tags (lowercase, no duplicates) that best summarize the key concepts of the question for searching.

Format:
SkillSheetID: (ID from list)
Tags: tag1, tag2, tag3

Question: "${question}"
`;

    try {
      let resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + window.openaiApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages: [
            { role: "system", content: "You are an EMS educator and NREMT instructor." },
            { role: "user", content: prompt }
          ],
          max_tokens: 60,
          temperature: 0
        })
      });
      let data = await resp.json();
      let skillLine = (data.choices && data.choices[0]?.message?.content?.match(/SkillSheetID:\s*(\S+)/i)) || [];
      let tagsLine = (data.choices && data.choices[0]?.message?.content?.match(/Tags:\s*([^\n]+)/i)) || [];
      let skillID = skillLine[1] || "";
      let tagsStr = tagsLine[1] || "";

      // Set skillSheetID ONLY if blank
      if ((!entry.skillSheetID || entry.skillSheetID === "") && SKILL_IDS.includes(skillID)) {
        entry.skillSheetID = skillID;
      }
      // Always set/replace tags (don't touch question/answer)
      entry.tags = tagsStr.split(",").map(t => t.trim().toLowerCase()).filter(t => t);

    } catch (err) {
      console.error("GPT error:", err);
      entry.tags = entry.tags || [];
    }

    done++;
    if (done % 10 === 0) {
      logBox.innerText = `Auto-tagged ${done}/${total}...`;
    }
    await new Promise(r => setTimeout(r, 800));
  }
  renderAllJsonEntries(window.jsonEditData);
  logBox.innerText = "✅ Auto-tagging complete! Review then Download.";
  alert("Done! Review your entries and download.");
}
