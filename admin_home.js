let responsesData = [];

const filePaths = [
  "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part1.json",
  "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part2.json",
  "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part3.json"
];

async function fetchAllFiles() {
  let all = [];

  for (const path of filePaths) {
    try {
      const res = await fetch(path);
      const json = await res.json();
      const entries = Array.isArray(json) ? json : json.responses || [];
      console.log(`✅ Fetched ${entries.length} entries from ${path}`);
      all = all.concat(entries);
    } catch (err) {
      console.error(`❌ Error loading ${path}: ${err.message}`);
    }
  }

  responsesData = all;
  renderResponses();
  log(`✅ Loaded ${responsesData.length} total entries.`);
}

function log(message) {
  document.getElementById("logBox").textContent = message;
}

function renderResponses() {
  const container = document.getElementById("responsesContainer");
  container.innerHTML = "";

  responsesData.forEach((entry, index) => {
    const card = document.createElement("div");
    card.className = "response";

    card.innerHTML = `
      <div class="row">
        <div class="field">
          <label>Question</label>
          <input type="text" value="${entry.question || ""}" />
        </div>
        <div class="field">
          <label>Answer</label>
          <textarea>${entry.answer || ""}</textarea>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", fetchAllFiles);
