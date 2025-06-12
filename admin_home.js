// scripts/admin_home.js

window.jsonEditData = {};
const filePathInput = document.getElementById("filePathInput");
const loadPathBtn = document.getElementById("loadPathBtn");
const jsonFileInput = document.getElementById("jsonFileInput");
const logBox = document.getElementById("logBox");
const responsesContainer = document.getElementById("responsesContainer");

// Attach event listeners via JS (always works with ES modules!)
if (loadPathBtn) {
  loadPathBtn.addEventListener("click", loadJsonFromPath);
}
if (jsonFileInput) {
  jsonFileInput.addEventListener("change", handleJsonFileSelect);
}

async function loadJsonFromPath() {
  const filePath = filePathInput.value.trim();
  if (!filePath) {
    logBox.innerText = "Please enter a file path.";
    return;
  }
  logBox.innerText = "Loading...";
  try {
    const resp = await fetch(filePath, {cache: "reload"});
    if (!resp.ok) throw new Error(`Could not fetch file: ${filePath} (${resp.status})`);
    const json = await resp.json();
    window.jsonEditData = json;
    renderAllJsonEntries(window.jsonEditData);
    logBox.innerText = `Loaded file: ${filePath}`;
  } catch (err) {
    logBox.innerText = "❌ " + err.message;
    responsesContainer.innerHTML = "";
    window.jsonEditData = {};
  }
}

function handleJsonFileSelect(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      window.jsonEditData = JSON.parse(e.target.result);
      renderAllJsonEntries(window.jsonEditData);
      logBox.innerText = "JSON file loaded from disk.";
    } catch (err) {
      logBox.innerText = "❌ Failed to parse JSON: " + err.message;
      responsesContainer.innerHTML = "";
      window.jsonEditData = {};
    }
  };
  reader.readAsText(file);
}

function renderAllJsonEntries(jsonData) {
  // Minimal: just show the raw JSON, expand as you like
  responsesContainer.innerHTML = "<pre>" + JSON.stringify(jsonData, null, 2) + "</pre>";
}
