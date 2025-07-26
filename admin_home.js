// Firebase Config (make sure this matches your own Firebase project)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get
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
dataContainer.innerHTML = "Loading...";

// Load all responses from Firebase
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

// Display function
function displayEntries(data) {
  dataContainer.innerHTML = ""; // Clear previous

  Object.entries(data).forEach(([scenarioKey, responses]) => {
    const scenarioTitle = document.createElement("h3");
    scenarioTitle.textContent = `Scenario: ${scenarioKey}`;
    dataContainer.appendChild(scenarioTitle);

    Object.entries(responses).forEach(([id, entry]) => {
      const entryDiv = document.createElement("div");
      entryDiv.style.border = "1px solid gray";
      entryDiv.style.padding = "10px";
      entryDiv.style.marginBottom = "10px";

      entryDiv.innerHTML = `
        <b>ID:</b> ${id}<br>
        <b>Question:</b> ${entry.question || ""}<br>
        <b>Answer:</b> ${entry.answer || ""}<br>
        <b>Role:</b> ${entry.role || ""}<br>
        <b>Score Category:</b> ${entry.scoreCategory || ""}<br>
        <b>Skill Sheet ID:</b> ${entry.skillSheetID || ""}<br>
        <b>Tags:</b> ${(entry.tags || []).join(", ")}<br>
        <b>Critical Fail:</b> ${entry.criticalFail}<br>
        <b>Points:</b> ${entry.points || 0}<br>
      `;

      dataContainer.appendChild(entryDiv);
    });
  });
}

// Start load
loadFirebaseResponses();
