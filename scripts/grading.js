let gradingTemplate = {};
let criticalFailures = [];
let improvementTips = {};
let scoreTracker = {};

export async function loadGradingAssets(type = "medical") {
  const [templateRes, failsRes, tipsRes] = await Promise.all([
    fetch(`grading_templates/${type}_assessment.json`),
    fetch(`grading_templates/critical_failures.json`),
    fetch(`grading_templates/grading_tips.json`)
  ]);

  gradingTemplate = await templateRes.json();
  criticalFailures = await failsRes.json();
  improvementTips = await tipsRes.json();

  initializeScoreTracker();
}

export function initializeScoreTracker() {
  scoreTracker = {
    completed: new Set(),
    points: 0,
    logs: [],
    userInputs: []
  };
}

export function updateScoreTracker(input) {
  const normalized = normalize(input);
  scoreTracker.userInputs.push(normalized);

  for (const key in gradingTemplate) {
    if (!scoreTracker.completed.has(key)) {
      const entry = gradingTemplate[key];
      const matches = entry.keywords.some(k => normalized.includes(k.toLowerCase()));
      if (matches) {
        scoreTracker.completed.add(key);
        scoreTracker.points += entry.points;
        scoreTracker.logs.push({ key, label: entry.label, points: entry.points });
      }
    }
  }
}

// Main grading result
export function gradeScenario() {
  const missedItems = Object.keys(gradingTemplate).filter(k => !scoreTracker.completed.has(k));
  const totalPossible = Object.values(gradingTemplate).reduce((sum, item) => sum + item.points, 0);
  const totalScore = scoreTracker.points;

  const passedItems = Array.from(scoreTracker.completed).map(k => gradingTemplate[k]?.label);
  const improvementSuggestions = missedItems
    .map(k => improvementTips[k])
    .filter(Boolean)
    .slice(0, 3);

  const criticals = findCriticalFailures(scoreTracker.userInputs);

  let feedback = `<b>Final Score:</b> ${totalScore} / ${totalPossible}<br><br>`;

  if (criticals.length) {
    feedback += `<b>❌ Critical Failures:</b><ul>${criticals.map(f => `<li>${f}</li>`).join("")}</ul><br>`;
  }

  if (passedItems.length) {
    feedback += `<b>✅ What You Did Well:</b><ul>${passedItems.slice(0, 5).map(i => `<li>${i}</li>`).join("")}</ul><br>`;
  }

  if (improvementSuggestions.length) {
    feedback += `<b>💡 Improvement Tips:</b><ul>${improvementSuggestions.map(t => `<li>${t}</li>`).join("")}</ul><br>`;
  }

  return feedback;
}

// Normalize for fuzzy match
function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/gi, '').trim();
}

// Detect critical failures
function findCriticalFailures(inputs) {
  const found = [];

  for (const rule of criticalFailures) {
    if (rule.keywords.length === 0 && rule.id === "timeout") {
      // Optional: detect timeout logic here
      continue;
    }

    for (const userInput of inputs) {
      const match = rule.keywords.some(keyword => userInput.includes(keyword.toLowerCase()));
      if (match) {
        found.push(rule.reason);
        break;
      }
    }
  }

  return found;
}
