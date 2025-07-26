<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>EMS Admin Panel</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      background-color: #f5f5f5;
    }
    h1 {
      color: #333;
    }
    h3 {
      margin-top: 30px;
      color: #004080;
    }
    .entry {
      border: 1px solid #ccc;
      background-color: #fff;
      padding: 12px;
      margin-bottom: 15px;
      border-radius: 8px;
    }
    .entry textarea, .entry input[type="text"] {
      width: 100%;
      padding: 6px;
      margin-top: 4px;
      margin-bottom: 10px;
      box-sizing: border-box;
    }
    .entry label {
      font-weight: bold;
    }
    .entry button {
      margin-top: 5px;
      margin-right: 10px;
    }
  </style>
</head>
<body>
  <h1>EMS Admin Panel</h1>
  <div id="dataContainer">Loading...</div>

  <!-- Firebase Modules -->
  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
    import {
      getDatabase,
      ref,
      get,
      set,
      remove,
      update
    } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

    const firebaseConfig = {
      apiKey: "AIzaSyA4-VhUuPBImHQDLVXiFtEu2KsGTRrViKE",
      authDomain: "ems-code-sim-a315a.firebaseapp.com",
      databaseURL: "https://ems-code-sim-a315a-default-rtdb.firebaseio.com",
      projectId: "ems-code-sim-a315a",
      storageBucket: "ems-code-sim-a315a.appspot.com",
      messagingSenderId: "1006981192218",
      appId: "1:1006981192218:web:3f5ae8d5a92f8dc9aa70b9"
    };

    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);
    const dataContainer = document.getElementById("dataContainer");

    async function loadFirebaseResponses() {
      const dbRef = ref(database, 'gpt4turbo_logs/scenarios/');
      try {
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          displayEntries(data);
        } else {
          dataContainer.innerHTML = "No data found.";
        }
      } catch (error) {
        console.error("Firebase read error:", error);
        dataContainer.innerHTML = "Error loading data.";
      }
    }

    function displayEntries(data) {
      dataContainer.innerHTML = "";
      Object.entries(data).forEach(([scenarioKey, responses]) => {
        const scenarioTitle = document.createElement("h3");
        scenarioTitle.textContent = `Scenario: ${scenarioKey}`;
        dataContainer.appendChild(scenarioTitle);

        Object.entries(responses).forEach(([id, entry]) => {
          const div = document.createElement("div");
          div.className = "entry";
          div.innerHTML = `
            <label>ID</label>
            <input type="text" value="${id}" readonly />

            <label>Question</label>
            <textarea rows="2">${entry.question || ""}</textarea>

            <label>Answer</label>
            <textarea rows="4">${entry.answer || ""}</textarea>

            <label>Role</label>
            <input type="text" value="${entry.role || ""}" />

            <label>Score Category</label>
            <input type="text" value="${entry.scoreCategory || ""}" />

            <label>Skill Sheet ID</label>
            <input type="text" value="${entry.skillSheetID || ""}" />

            <label>Tags (comma separated)</label>
            <input type="text" value="${(entry.tags || []).join(", ")}" />

            <label>Critical Fail</label>
            <input type="text" value="${entry.criticalFail || ""}" />

            <label>Points</label>
            <input type="text" value="${entry.points || 0}" />

            <button onclick="alert('Edit feature coming soon')">Edit</button>
            <button onclick="deleteEntry('${scenarioKey}', '${id}')">Delete</button>
          `;
          dataContainer.appendChild(div);
        });
      });
    }

    async function deleteEntry(scenarioKey, entryId) {
      const confirmDelete = confirm(`Delete entry ${entryId}?`);
      if (!confirmDelete) return;

      const entryRef = ref(database, `gpt4turbo_logs/scenarios/${scenarioKey}/${entryId}`);
      try {
        await remove(entryRef);
        alert("Entry deleted. Reloading...");
        loadFirebaseResponses();
      } catch (error) {
        console.error("Delete failed:", error);
        alert("Failed to delete entry.");
      }
    }

    loadFirebaseResponses();
  </script>
</body>
</html>
