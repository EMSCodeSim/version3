const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = "";
let hardcodedResponses = {};

// Load hardcoded responses from Firebase
firebase.database().ref('hardcodedResponses').once('value').then(snapshot => {
  hardcodedResponses = snapshot.val() || {};
  console.log("✅ Loaded hardcodedResponses:", hardcodedResponses);
});

// Load dispatch
async function loadDispatchInfo() {
  try {
    const res = await fetch(`${scenarioPath}dispatch.txt`);
    return await res.text();
  } catch (e) {
    logErrorToDatabase("Failed to load dispatch.txt: " + e.message);
    return "Dispatch not available.";
  }
}

// Load patient
async function loadPatientInfo() {
  try {
    const res = await fetch(`${scenarioPath}patient.txt`);
    return await res.text();
  } catch (e) {
    logErrorToDatabase("Failed to load patient.txt: " + e.message);
    return "Patient info not available.";
  }
}

// Error logger
function logErrorToDatabase(errorInfo) {
  console.error("🔴 Error:", errorInfo);
  if (firebase?.database) {
    firebase.database().ref('error_logs').push({
      error: errorInfo,
      timestamp: Date.now()
    });
  }
}

// Display response in chat
function displayChatResponse(response) {
  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML += `<div class="response">${response}</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Check hardcoded response
function checkHardcodedResponse(message) {
  if (!hardcodedResponses) return null;
  return hardcodedResponses[message.toLower
