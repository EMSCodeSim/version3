// scripts/admin_home.js

const filePathInput = document.getElementById("filePathInput");
const loadPathBtn = document.getElementById("loadPathBtn");
const jsonFileInput = document.getElementById("jsonFileInput");
const logBox = document.getElementById("logBox");
const fileContent = document.getElementById("fileContent");

// -- Load from path --
if (loadPathBtn) {
  loadPathBtn.addEventListener("click", async () => {
    const filePath = filePathInput.value.trim();
    if (!filePath) {
      logBox.innerText = "Please enter a file path (e.g. /ems_database.json)";
      fileContent.innerText = "";
      return;
    }
    logBox.innerText = "Loading...";
    fileContent.innerText = "";
    try {
      const ext = filePath.split('.').pop().toLowerCase();
      const resp = await fetch(filePath, {cache: "reload"});
      if (!resp.ok) throw new Error(`Could not fetch file: ${filePath} (${resp.status})`);
      let data;
      if (ext === "json") {
        data = await resp.json();
        fileContent.innerHTML = "<pre>" + JSON.stringify(data, null, 2) + "</pre>";
      } else {
        data = await resp.text();
        fileContent.innerText = data;
      }
      logBox.innerText = `Loaded file: ${filePath}`;
    } catch (err) {
      logBox.innerText = "❌ " + err.message;
      fileContent.innerText = "";
    }
  });
}

// -- Load from file upload --
if (jsonFileInput) {
  jsonFileInput.addEventListener("change", (evt) => {
    const file = evt.target.files[0];
    if (!file) return;
    logBox.innerText = "Reading file...";
    fileContent.innerText = "";
    const reader = new FileReader();
    reader.onload = function(e) {
      const ext = (file.name.split('.').pop() || "").toLowerCase();
      try {
        if (ext === "json") {
          const json = JSON.parse(e.target.result);
          fileContent.innerHTML = "<pre>" + JSON.stringify(json, null, 2) + "</pre>";
        } else {
          fileContent.innerText = e.target.result;
        }
        logBox.innerText = "Loaded file: " + file.name;
      } catch (err) {
        logBox.innerText = "❌ Failed to parse file: " + err.message;
        fileContent.innerText = "";
      }
    };
    reader.readAsText(file);
  });
}

