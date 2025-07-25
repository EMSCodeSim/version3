<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>EMS Admin Panel</title>
  <style>
    body { font-family: Arial, sans-serif; background: #fff; padding: 20px; }
    .entry { border-bottom: 1px solid #ccc; padding: 10px 0; }
    label { display: block; margin-top: 8px; font-weight: bold; }
    textarea, input, select { width: 100%; margin-top: 4px; }
    button { margin-right: 10px; margin-top: 10px; }
    .log { background: black; color: lime; padding: 10px; margin-top: 10px; font-family: monospace; }
  </style>
</head>
<body>
  <h1>EMS Admin Panel</h1>
  <div id="entries"></div>
  <button onclick="removeDuplicates()">Remove Duplicates</button>
  <div id="log" class="log">Loading...</div>

  <script>
    const scenarioPath = "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part1.json";

    const skillSheetOptions = [
      "sceneSizeUp", "primarySurvey", "historyTaking",
      "secondaryAssessment", "vitalSigns", "reassessment",
      "chiefComplaint", "treatmentPlan", "transportDecision",
      "interventions", "patientSummary", "Assessment"
    ];

    async function loadData() {
      try {
        const res = await fetch(scenarioPath);
        const data = await res.json();
        const container = document.getElementById("entries");
        container.innerHTML = '';
        const entries = Object.entries(data);
        entries.forEach(([id, entry]) => {
          const div = document.createElement("div");
          div.className = "entry";
          div.innerHTML = `
            <label>Question</label>
            <textarea>${entry.question}</textarea>
            <label>Answer</label>
            <textarea>${entry.answer}</textarea>
            <label>Tags (comma-separated)</label>
            <input type="text" value="${(entry.tags || []).join(", ")}" />
            <label>Role</label>
            <input type="text" value="${entry.role}" />
            <label>Score Category</label>
            <input type="text" value="${entry.scoreCategory || ""}" />
            <label>Skill Sheet ID</label>
            <select>
              ${skillSheetOptions.map(opt =>
                `<option value="${opt}" ${entry.skillSheetID === opt ? "selected" : ""}>${opt}</option>`).join("")
              }
            </select>
            <label>Points</label>
            <input type="number" value="${entry.points || 0}" />
            <label>Critical Fail</label>
            <input type="checkbox" ${entry.criticalFail ? "checked" : ""} />
            <label>TTS Audio (base64)</label>
            <textarea>${entry.ttsAudio ? entry.ttsAudio.substring(0, 50) + "..." : ""}</textarea>
            <button onclick="deleteEntry(this)">Delete</button>
          `;
          container.appendChild(div);
        });
        log(`✅ Loaded ${entries.length} entries.`);
      } catch (err) {
        console.error(err);
        log("❌ Failed to load file.");
      }
    }

    function deleteEntry(btn) {
      const entryDiv = btn.parentElement;
      entryDiv.remove();
      log("Entry deleted (unsaved change)");
    }

    function removeDuplicates() {
      const entries = document.querySelectorAll('.entry');
      const seen = new Set();
      let removed = 0;
      entries.forEach(entry => {
        const question = entry.querySelector('textarea').value.trim().toLowerCase();
        if (seen.has(question)) {
          entry.remove();
          removed++;
        } else {
          seen.add(question);
        }
      });
      log(`🧹 Removed ${removed} duplicate(s).`);
    }

    function log(message) {
      document.getElementById("log").textContent = message;
    }

    loadData();
  </script>
</body>
</html>
