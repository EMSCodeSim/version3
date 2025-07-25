document.addEventListener("DOMContentLoaded", async () => {
  const urls = [
    "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part1.json",
    "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part2.json",
    "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part3.json"
  ];

  const statusBox = document.getElementById("statusBox");
  const container = document.getElementById("entryContainer");
  let combinedEntries = [];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const entries = Object.entries(data).map(([key, value]) => ({
        id: key,
        ...value
      }));

      combinedEntries.push(...entries);
    } catch (err) {
      console.error("Failed to fetch or parse:", url, err);
      statusBox.innerText = `❌ Failed to load from ${url}`;
      return;
    }
  }

  if (combinedEntries.length === 0) {
    statusBox.innerText = "⚠️ No entries found.";
    return;
  }

  renderEntries(combinedEntries, container);
  statusBox.innerText = `✅ Loaded ${combinedEntries.length} total entries.`;

  // Deduplication button
  document.getElementById("dedupBtn").addEventListener("click", () => {
    const unique = [];
    const seen = new Set();

    for (const entry of combinedEntries) {
      const key = (entry.question || "").toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(entry);
      }
    }

    container.innerHTML = "";
    renderEntries(unique, container);
    statusBox.innerText = `🧹 Removed duplicates. Showing ${unique.length} entries.`;
  });
});

function renderEntries(entries, container) {
  container.innerHTML = "";

  entries.forEach((entry, index) => {
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `
      <p><strong>Question:</strong><br><input type="text" value="${entry.question || ""}" data-index="${index}" data-key="question" /></p>
      <p><strong>Answer:</strong><br><textarea rows="3" data-index="${index}" data-key="answer">${entry.answer || ""}</textarea></p>
      <p><strong>Role:</strong><br><input type="text" value="${entry.role || ""}" data-index="${index}" data-key="role" /></p>
      <p><strong>Tags:</strong><br><input type="text" value="${(entry.tags || []).join(", ")}" data-index="${index}" data-key="tags" /></p>
      <p><strong>Score Category:</strong><br><input type="text" value="${entry.scoreCategory || ""}" data-index="${index}" data-key="scoreCategory" /></p>
      <p><strong>Skill Sheet ID:</strong><br>
        <select data-index="${index}" data-key="skillSheetID">
          <option value="">-- Select --</option>
          <option value="sceneSizeUp">Scene Size-up</option>
          <option value="primaryAssessment">Primary Assessment</option>
          <option value="oxygenTherapy">Oxygen Therapy</option>
          <option value="historyTaking">History Taking</option>
          <option value="secondaryAssessment">Secondary Assessment</option>
          <option value="vitalSigns">Vital Signs</option>
          <option value="management">Management</option>
          <option value="reassessment">Reassessment</option>
        </select>
      </p>
      <p><strong>Points:</strong><br><input type="number" value="${entry.points || 0}" data-index="${index}" data-key="points" /></p>
      <p><strong>Critical Fail:</strong><br><input type="checkbox" ${entry.criticalFail ? "checked" : ""} data-index="${index}" data-key="criticalFail" /></p>
      ${entry.ttsAudio ? `<button onclick="playAudio('${entry.ttsAudio}')">🔊 Play</button>` : ""}
      <button onclick="this.parentElement.remove()">❌ Delete</button>
      <hr>
    `;

    container.appendChild(div);
  });

  bindFieldListeners(entries);
}

function bindFieldListeners(entries) {
  document.querySelectorAll("input, textarea, select").forEach(el => {
    el.addEventListener("input", () => {
      const index = parseInt(el.dataset.index);
      const key = el.dataset.key;

      if (key === "tags") {
        entries[index][key] = el.value.split(",").map(t => t.trim());
      } else if (key === "criticalFail") {
        entries[index][key] = el.checked;
      } else {
        entries[index][key] = el.value;
      }
    });
  });
}

function playAudio(base64) {
  const audio = new Audio("data:audio/mp3;base64," + base64);
  audio.play();
}
