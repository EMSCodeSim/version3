<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EMS Admin Panel</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .entry {
      background: #fff;
      padding: 15px;
      margin-bottom: 10px;
      border: 1px solid #ccc;
      border-radius: 5px;
    }
    label {
      display: block;
      font-weight: bold;
      margin-top: 5px;
    }
    input, select, textarea {
      width: 100%;
      padding: 8px;
      margin: 5px 0 10px 0;
    }
    button {
      padding: 8px 12px;
      margin-top: 10px;
    }
    .status {
      font-family: monospace;
      background: #000;
      color: #0f0;
      padding: 5px 10px;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <h1>EMS Admin Panel</h1>
  <div id="status" class="status">Loading...</div>
  <div id="entries"></div>
  <button onclick="removeDuplicates()">Check & Remove Duplicate Questions</button>

  <script>
    const skillSheetOptions = [
      "sceneSizeUp", "primarySurvey", "chiefComplaint", "historyTaking", "secondaryAssessment", "vitals", "treatmentPlan", "reassessment", "handoffReport"
    ];

    async function loadDatabase() {
      const url = "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part1.json";
      const res = await fetch(url);
      const data = await res.json();
      let unique = {};
      let count = 0;
      let container = document.getElementById('entries');

      for (const id in data) {
        const entry = data[id];
        if (unique[entry.question]) continue;
        unique[entry.question] = true;
        count++;

        const div = document.createElement('div');
        div.className = 'entry';
        div.innerHTML = `
          <label>Question:</label>
          <input value="${entry.question}" />

          <label>Answer:</label>
          <textarea>${entry.answer}</textarea>

          <label>Tags:</label>
          <input value="${(entry.tags || []).join(', ')}" />

          <label>Role:</label>
          <input value="${entry.role || ''}" />

          <label>Score Category:</label>
          <input value="${entry.scoreCategory || ''}" />

          <label>Skill Sheet ID:</label>
          <select>
            ${skillSheetOptions.map(opt => `<option value="${opt}" ${opt === entry.skillSheetID ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>

          <label>Points:</label>
          <input type="number" value="${entry.points || 0}" />

          <label>Critical Fail:</label>
          <select><option value="false" ${entry.criticalFail === false ? 'selected' : ''}>false</option><option value="true" ${entry.criticalFail === true ? 'selected' : ''}>true</option></select>

          <label>TTS Audio:</label>
          <textarea rows="2">${entry.ttsAudio || ''}</textarea>

          <button onclick="this.parentNode.remove()">Delete</button>
        `;
        container.appendChild(div);
      }

      document.getElementById('status').textContent = `Loaded ${count} total entries.`;
    }

    function removeDuplicates() {
      let questions = new Set();
      let entries = document.querySelectorAll('.entry');
      let removed = 0;

      entries.forEach(entry => {
        let question = entry.querySelector('input').value.trim().toLowerCase();
        if (questions.has(question)) {
          entry.remove();
          removed++;
        } else {
          questions.add(question);
        }
      });

      document.getElementById('status').textContent += ` Removed ${removed} duplicates.`;
    }

    loadDatabase();
  </script>
</body>
</html>
