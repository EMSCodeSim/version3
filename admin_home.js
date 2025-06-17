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
    logBox.innerText = `Loaded file: ${filePath}`;
  } catch (err) {
    logBox.innerText = "❌ " + err.message;
    responsesContainer.innerText = "";
    window.jsonEditData = {};
    downloadEditedJsonBtn.style.display = "none";
    bulkAssignBtn.style.display = "none";
    convertLegacyBtn.style.display = "none";
    dedupeGptBtn.style.display = "none";
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
      logBox.innerText = "JSON file loaded from disk.";
    } catch (err) {
      logBox.innerText = "❌ Failed to parse JSON: " + err.message;
      responsesContainer.innerText = "";
      window.jsonEditData = {};
      downloadEditedJsonBtn.style.display = "none";
      bulkAssignBtn.style.display = "none";
      convertLegacyBtn.style.display = "none";
      dedupeGptBtn.style.display = "none";
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

  // --- AUDIO CONTROLS ---
  let audioControls = '';
  if (data.ttsAudio) {
    audioControls += `<audio id="audio-${key}" controls src="data:audio/mp3;base64,${data.ttsAudio}"></audio>`;
  } else {
    audioControls += `<div style="color: #888; font-size: 0.95em;">No audio</div>`;
  }
  audioControls += `
    <button class="btn" type="button" onclick="reRecordTTS('${key}')">🔴 Record New Audio</button>
    <span style="font-size:0.98em;margin-left:8px;color:#555;">(Role: ${data.role || "unknown"})</span>
    <span id="audio-status-${key}" style="margin-left:8px;color:#1976d2"></span>
  `;

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
    <div class="field"><label>Audio Review/Record:</label><div>${audioControls}</div></div>
    <button class="btn" onclick="saveJsonEditEntry('${key}')">💾 Save</button>
    <button class="btn" onclick="deleteJsonEntry('${key}')">🗑 Delete</button>
  `;
  responsesContainer.appendChild(div);
}

// All other functions unchanged (setManualTrigger, saveJsonEditEntry, etc.)
// ...

// === AUDIO RE-RECORD TTS ===
window.reRecordTTS = async function(key) {
  if (!window.jsonEditData || !window.jsonEditData[key]) return;
  const entry = window.jsonEditData[key];
  const responseText = document.getElementById(`r-${key}`)?.value || entry.response || entry.answer || "";
  if (!responseText.trim()) {
    alert("No response text found to synthesize.");
    return;
  }

  // Ask for API key if not present
  if (!window.openaiApiKey) {
    window.openaiApiKey = prompt("Enter your OpenAI API Key (will NOT be sent anywhere except OpenAI):", "");
    if (!window.openaiApiKey) return alert("API key required.");
  }

  // Select correct TTS voice for role
  let role = (document.getElementById(`role-${key}`)?.value || entry.role || "").toLowerCase();
  let voice = "onyx"; // Default to Onyx for Patient
  if (role.includes("proctor")) voice = "shimmer";
  if (role.includes("instructor")) voice = "shimmer";
  if (role.includes("patient")) voice = "onyx";

  // UI status
  const statusSpan = document.getElementById(`audio-status-${key}`);
  if (statusSpan) statusSpan.textContent = " Recording via OpenAI TTS...";

  try {
    // OpenAI TTS API call
    const resp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + window.openaiApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1",
        input: responseText,
        voice: voice,
        response_format: "mp3"
      })
    });

    if (!resp.ok) throw new Error("TTS API failed: " + resp.statusText);
    const arrayBuffer = await resp.arrayBuffer();
    // Convert mp3 to base64
    const base64 = arrayBufferToBase64(arrayBuffer);

    // Save to entry and update UI
    entry.ttsAudio = base64;
    if (Array.isArray(window.jsonEditData)) {
      window.jsonEditData[key] = entry;
    } else {
      window.jsonEditData[key] = entry;
    }
    statusSpan.textContent = " ✔️ Audio updated!";
    setTimeout(() => { statusSpan.textContent = ""; }, 2200);
    renderAllJsonEntries(window.jsonEditData); // re-render for playback
  } catch (err) {
    if (statusSpan) statusSpan.textContent = " ❌ TTS failed!";
    alert("TTS failed: " + err.message);
  }
};

function arrayBufferToBase64(buffer) {
  let binary = '';
  let bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Leave all your other bulk assign, delete, save, convert functions unchanged...
