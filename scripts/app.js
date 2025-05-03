
import { initializeScoreTracker, updateScoreTracker, gradeScenario, scoreTracker, gradingTemplate } from './grading.js';

async function startScenario() {
  console.log("Start Scenario Triggered");

  try {
    const scenarioPath = 'scenarios/chest_pain_002/';
    const configRes = await fetch(`${scenarioPath}config.json`);
    const config = await configRes.json();
    const gradingType = config.grading || "medical";

    const gradingRes = await fetch(`grading_templates/${gradingType}_assessment.json`);
    const template = await gradingRes.json();
    Object.assign(gradingTemplate, template);
    initializeScoreTracker();

    const dispatch = await fetch(`${scenarioPath}dispatch.txt`).then(r => r.text());
    const patientContext = await fetch(`${scenarioPath}patient.txt`).then(r => r.text());
    displayChatResponse(`🚑 Dispatch: ${dispatch}`);
  } catch (err) {
    console.error("Error starting scenario:", err);
  }
}

function endScenario() {
  console.log("End Scenario Triggered");
  const summary = gradeScenario();
  displayChatResponse(summary);
}

function displayChatResponse(message) {
  const box = document.getElementById("chat-box");
  box.innerHTML += `<div class="chat-entry">${message}</div>`;
  box.scrollTop = box.scrollHeight;
}

function processUserMessage(message) {
  updateScoreTracker(message);
  displayChatResponse(`<b>You:</b> ${message}`);
}

// DOM Setup
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('send-button')?.addEventListener('click', () => {
    const input = document.getElementById('user-input');
    const msg = input.value.trim();
    if (msg) {
      processUserMessage(msg);
      input.value = '';
    }
  });

  document.getElementById('mic-button')?.addEventListener('click', () => {
    alert("Mic functionality placeholder");
  });
});

window.startScenario = startScenario;
window.endScenario = endScenario;
