// scripts/admin_home.js

const filePathInput = document.getElementById("filePathInput");
const loadPathBtn = document.getElementById("loadPathBtn");
const jsonFileInput = document.getElementById("jsonFileInput");
const logBox = document.getElementById("logBox");
const responsesContainer = document.getElementById("responsesContainer");

if (loadPathBtn) {
  loadPathBtn.addEventListener("click", async () => {
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
      responsesContainer.innerHTML = "<pre>" + JSON.stringify(json, null, 2) + "</pre>";
      logBox.innerText = `Loaded file: ${filePath}`;
    } catch (err) {
      logBox.innerText = "❌ " + err.message;
      responsesContainer.innerHTML = "";
    }
  });
}

if (jsonFileInput) {
  jsonFileInput.addEventListener("change", (evt) => {
    const file = evt.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const json = JSON.parse(e.target.result);
        responsesContainer.innerHTML = "<pre>" + JSON.stringify(json, null, 2) + "</pre>";
        logBox.innerText = "JSON file loaded from disk.";
      } catch (err) {
        logBox.innerText = "❌ Failed to parse JSON: " + err.message;
        responsesContainer.innerHTML = "";
      }
    };
    reader.readAsText(file);
  });
}
