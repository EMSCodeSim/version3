// app.js

let currentScenarioId = 'chest_pain_002';
let hardcodedResponses = [];
let scenarioStarted = false;

// Util: Get current scenario folder path
function getCurrentScenarioPath() {
  return `scenarios/${currentScenarioId}/`;
}

// Show/hide scenario picker row
function showScenarioPicker(show) {
  const picker = document.getElementById('scenario-select-container');
  if (picker) picker.hidden = !show;
}

// Main: Start a new scenario
window.startScenario = async function startScenario() {
  if (scenarioStarted) return;
  scenarioStarted = true;
  showScenarioPicker(false);

  const scenarioPath = getCurrentScenarioPath();
  try {
    // Load config
    const configRes = await fetch(`${scenarioPath}config.json`);
    if (!configRes.ok) throw new Error("Missing config.json");
    const config = await configRes.json();

    // Load dispatch
    const dispatchRes = await fetch(config.dispatchFile);
    const dispatchText = await dispatchRes.text();

    // Load patient info
    const patientRes = await fetch(config.patientFile);
    const patientText = await patientRes.text();

    // Load hardcoded responses
    const hrRes = await fetch(config.hardcodedResponses);
    hardcodedResponses = await hrRes.json();

    // Start scenario: show dispatch and patient info
    const chatBox = document.getElementById('chat-box');
    if (chatBox) {
      chatBox.innerHTML = `<div><b>Dispatch:</b> ${dispatchText}</div>
        <div><b>Scene:</b> ${patientText}</div>
        <div style="color:#aaa;margin-top:0.5rem"><i>(Scenario loaded. Ask questions or give commands below.)</i></div>`;
    }
  } catch (err) {
    const chatBox = document.getElementById('chat-box');
    if (chatBox) chatBox.innerHTML = `<span style="color:red"><b>Error loading scenario:</b> ${err.message}</span>`;
    scenarioStarted = false;
    showScenarioPicker(true);
  }
};

// End scenario, reset picker
window.endScenario = function () {
  scenarioStarted = false;
  const chatBox = document.getElementById('chat-box');
  if (chatBox) chatBox.innerHTML += `<div class="chat-bubble system-bubble">Scenario ended.</div>`;
  showScenarioPicker(true);
};

// Scenario picker logic
window.addEventListener('DOMContentLoaded', () => {
  const picker = document.getElementById('scenario-picker');
  if (picker) {
    picker.addEventListener('change', (e) => {
      currentScenarioId = e.target.value;
    });
  }

  // Start Scenario button
  const startBtn = document.getElementById('start-scenario-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      currentScenarioId = picker.value;
      window.startScenario();
    });
  }

  // End Scenario button
  const endBtn = document.getElementById('end-button');
  if (endBtn) {
    endBtn.addEventListener('click', () => {
      window.endScenario();
    });
  }

  // Show picker on initial load
  showScenarioPicker(true);
});

// Chat input/response logic
function getResponse(userQ) {
  let q = userQ.trim().toLowerCase();
  let resp = (hardcodedResponses || []).find(
    h => h.question.trim().toLowerCase() === q
  );
  if (resp) return resp;
  // Tag/keyword fallback
  for (let h of (hardcodedResponses || [])) {
    if (h.tags && h.tags.some(tag => q.includes(tag.toLowerCase()))) {
      return h;
    }
  }
  return { answer: "I'm not sure. Try rephrasing your question or asking about assessment, history, treatment, or transport.", scoreCategory: "Unknown" };
}

window.sendMessage = function () {
  let input = document.getElementById('user-input');
  let userQ = input.value.trim();
  if (!userQ) return;
  let chatBox = document.getElementById('chat-box');
  chatBox.innerHTML += `<div><b>You:</b> ${userQ}</div>`;
  let response = getResponse(userQ);
  chatBox.innerHTML += `<div><b>Patient:</b> ${response.answer}</div>`;
  input.value = '';
  chatBox.scrollTop = chatBox.scrollHeight;
};

// Enter key triggers send
window.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-button');
  if (input && sendBtn) {
    input.addEventListener('keydown', (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendBtn.click();
      }
    });
  }
});
