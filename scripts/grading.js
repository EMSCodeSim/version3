// grading.js

let gradingTemplate = {};
let scoreTracker = {};

// Loads grading template (JSON object) and initializes blank scoreTracker
export function initializeScoreTracker(template) {
  gradingTemplate = template;
  scoreTracker = {};
  Object.keys(gradingTemplate).forEach(skillSheetID => {
    scoreTracker[skillSheetID] = false;
  });
  scoreTracker.criticalFails = [];
}

// Mark a skillSheetID as completed (called on user action)
// Optionally flag critical fails here
export function updateScoreTrackerBySkillID(skillSheetID) {
  if (gradingTemplate[skillSheetID]) {
    scoreTracker[skillSheetID] = true;
    // If this ID is a critical fail, handle here (expand as needed)
    if (gradingTemplate[skillSheetID].criticalFail) {
      if (!scoreTracker.criticalFails.includes(gradingTemplate[skillSheetID].label)) {
        scoreTracker.criticalFails.push(gradingTemplate[skillSheetID].label);
      }
    }
  }
}

// Optionally allow keyword grading (backwards-compatible)
export function updateScoreTrackerByInput(input) {
  const lower = input.toLowerCase();
  for (let key in gradingTemplate) {
    const keywords = gradingTemplate[key].keywords || [];
    if (keywords.some(word => lower.includes(word))) {
      updateScoreTrackerBySkillID(key);
    }
  }
  // Example critical fail logic (expand as needed)
  if (lower.includes("no gloves") || lower.includes("no ppe")) {
    if (!scoreTracker.criticalFails.includes("Did not apply PPE")) {
      scoreTracker.criticalFails.push("Did not apply PPE");
    }
  }
}

// Preferred: grade by Skill Sheet ID, called on each user-scored event
export function gradeActionBySkillID(skillSheetID) {
  updateScoreTrackerBySkillID(skillSheetID);
}

// Optionally: grade by raw user input (legacy)
export function gradeInput(input) {
  updateScoreTrackerByInput(input);
}

// Generate improvement tips based on missed steps (expand as desired)
export async function getImprovementTips(missedLabels) {
  if (!missedLabels.length) return "";
  return "Review the missed steps and focus on assessment order. Remember to verbalize PPE and scene safety!";
}

// Returns an HTML grading summary (for end-of-scenario or skill sheet view)
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
