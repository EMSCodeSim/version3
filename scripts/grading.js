// grading.js

let gradingTemplate = {};
let scoreTracker = {};

// Initializes tracker and template for this scenario
export function initializeScoreTracker(template) {
  gradingTemplate = template;
  scoreTracker = {};
  Object.keys(gradingTemplate).forEach(key => {
    scoreTracker[key] = false;
  });
  scoreTracker.criticalFails = [];
}

// Call this on each user action/input
export function updateScoreTracker(input) {
  const lower = input.toLowerCase();
  for (let key in gradingTemplate) {
    const keywords = gradingTemplate[key].keywords || [];
    if (keywords.some(word => lower.includes(word))) {
      scoreTracker[key] = true;
    }
  }

  // Example: critical fail logic (expand as needed)
  if (lower.includes("no gloves") || lower.includes("no ppe")) {
    if (!scoreTracker.criticalFails.includes("Did not apply PPE")) {
      scoreTracker.criticalFails.push("Did not apply PPE");
    }
  }
}

// Allow direct grading from any raw mic or text input
export function gradeInput(input) {
  updateScoreTracker(input);

  // Display live feedback (optional)
  const feedback = [];
  const lower = input.toLowerCase();

  if (lower.includes("oxygen") && lower.includes("nrb")) {
    feedback.push("✅ Recognized: Oxygen via NRB");
  }
  if (lower.includes("scene safe") || lower.includes("bsi")) {
    feedback.push("✅ Recognized: Scene Safety");
  }
  if (lower.includes("check pulse") || lower.includes("carotid")) {
    feedback.push("✅ Recognized: Pulse Check");
  }

  const chatBox = document.getElementById("chat-box");
  if (chatBox && feedback.length > 0) {
    const response = document.createElement("div");
    response.className = "grading-msg";
    response.innerHTML = feedback.join("<br>");
    chatBox.appendChild(response);
  }
}

// Generate improvement tips (could be local or AI-backed)
export async function getImprovementTips(missedLabels) {
  if (!missedLabels.length) return "";
  return "Review the missed steps and focus on assessment order. Remember to verbalize PPE and scene safety!";
}

// The main grading/report function!
export async function gradeScenario() {
  let completed = [];
  let missed = [];
  let criticals = scoreTracker.criticalFails || [];

  for (const key in gradingTemplate) {
    if (scoreTracker[key]) completed.push(gradingTemplate[key].label);
    else missed.push(gradingTemplate[key].label);
  }

  let improvementTips = "";
  if (missed.length > 0 && typeof getImprovementTips === 'function') {
    improvementTips = await getImprovementTips(missed);
  }

  let html = `
    <p><strong>Score:</strong> ${completed.length} / ${Object.keys(gradingTemplate).length}</p>
    ${criticals.length ? `<p style="color:red;"><strong>Critical Failures:</strong> ${criticals.join(', ')}</p>` : ''}
    <h4>Completed Steps:</h4>
    <ul>${completed.map(i => `<li>${i}</li>`).join('')}</ul>
    <h4>Missed Steps:</h4>
    <ul>${missed.map(i => `<li>${i}</li>`).join('')}</ul>
    ${improvementTips ? `<h4>Improvement Tips:</h4><div>${improvementTips}</div>` : ''}
  `;
  return html;
}
