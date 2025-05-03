export let scoreTracker = {};
export let gradingTemplate = {};

// Initialize score tracker
export function initializeScoreTracker() {
  scoreTracker = {
    completed: new Set(),
    points: 0,
    criticalFailures: [],
    logs: []
  };
}

// Check and update score based on a message
export function updateScoreTracker(message) {
  const text = message.toLowerCase();

  for (const [key, entry] of Object.entries(gradingTemplate)) {
    if (!scoreTracker.completed.has(key)) {
      const found = entry.keywords.some(kw => text.includes(kw));
      if (found) {
        scoreTracker.completed.add(key);
        scoreTracker.points += entry.points;
        scoreTracker.logs.push(`✅ ${entry.label} (+${entry.points})`);
      }
    }
  }

  // Critical failure checks
  if (text.includes("no ppe") || text.includes("didn’t wear ppe")) {
    scoreTracker.criticalFailures.push("❌ Failure to take or verbalize PPE precautions");
  }

  if (text.includes("scene unsafe") || text.includes("not safe")) {
    scoreTracker.criticalFailures.push("❌ Failed to determine scene safety before approaching patient");
  }

  if (text.includes("no oxygen") || text.includes("refused oxygen when needed")) {
    scoreTracker.criticalFailures.push("❌ Failed to provide appropriate oxygen therapy");
  }

  if (text.includes("dangerous drug") || text.includes("wrong dose") || text.includes("gave wrong treatment")) {
    scoreTracker.criticalFailures.push("❌ Ordered a dangerous or inappropriate intervention");
  }

  if (text.includes("no spinal") && text.includes("neck") || text.includes("c-spine") && text.includes("ignored")) {
    scoreTracker.criticalFailures.push("❌ Failed to provide spinal protection when indicated");
  }
}

// Final grading and feedback
export function gradeScenario() {
  const maxPoints = 48;
  const total = scoreTracker.points;
  const percent = Math.round((total / maxPoints) * 100);

  let feedback = `<h3>📊 Final Score: ${total} / ${maxPoints} (${percent}%)</h3>`;
  feedback += "<ul>";

  // Show passed items
  for (const log of scoreTracker.logs) {
    feedback += `<li>${log}</li>`;
  }

  // Show critical failures
  if (scoreTracker.criticalFailures.length > 0) {
    feedback += "</ul><h4>⚠️ Critical Failures:</h4><ul>";
    for (const fail of scoreTracker.criticalFailures) {
      feedback += `<li>${fail}</li>`;
    }
  }

  // Positive feedback
  feedback += "</ul><h4>✅ What You Did Well:</h4><ul>";
  const good = [...scoreTracker.completed].slice(0, 3);
  for (const key of good) {
    if (gradingTemplate[key]) {
      feedback += `<li>${gradingTemplate[key].label}</li>`;
    }
  }

  // Improvement tips
  feedback += "</ul><h4>💡 Improvement Tips:</h4><ul>";
  const missed = Object.keys(gradingTemplate).filter(k => !scoreTracker.completed.has(k));
  missed.slice(0, 3).forEach(key => {
    if (gradingTemplate[key]) {
      feedback += `<li>Try to include: <b>${gradingTemplate[key].label}</b></li>`;
    }
  });

  feedback += "</ul>";
  return feedback;
}
