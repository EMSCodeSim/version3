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

// Helpers
function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
}

function similarity(a, b) {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Score tracker w/ fuzzy grading
export function updateScoreTracker(message) {
  const userInput = normalize(message);

  for (const [key, entry] of Object.entries(gradingTemplate)) {
    if (!scoreTracker.completed.has(key)) {
      const match = entry.keywords.some(kw => {
        const sim = similarity(userInput, normalize(kw));
        return sim >= 0.85;
      });
      if (match) {
        scoreTracker.completed.add(key);
        scoreTracker.points += entry.points;
        scoreTracker.logs.push(`✅ ${entry.label} (+${entry.points})`);
      }
    }
  }

  // Critical failure checks
  if (userInput.includes("no ppe") || userInput.includes("didn’t wear ppe")) {
    scoreTracker.criticalFailures.push("❌ Failure to take or verbalize PPE precautions");
  }

  if (userInput.includes("scene unsafe") || userInput.includes("not safe")) {
    scoreTracker.criticalFailures.push("❌ Failed to determine scene safety before approaching patient");
  }

  if (userInput.includes("no oxygen") || userInput.includes("refused oxygen when needed")) {
    scoreTracker.criticalFailures.push("❌ Failed to provide appropriate oxygen therapy");
  }

  if (userInput.includes("dangerous drug") || userInput.includes("wrong dose") || userInput.includes("gave wrong treatment")) {
    scoreTracker.criticalFailures.push("❌ Ordered a dangerous or inappropriate intervention");
  }

  if ((userInput.includes("no spinal") && userInput.includes("neck")) || (userInput.includes("c-spine") && userInput.includes("ignored"))) {
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

  for (const log of scoreTracker.logs) {
    feedback += `<li>${log}</li>`;
  }

  if (scoreTracker.criticalFailures.length > 0) {
    feedback += "</ul><h4>⚠️ Critical Failures:</h4><ul>";
    for (const fail of scoreTracker.criticalFailures) {
      feedback += `<li>${fail}</li>`;
    }
  }

  feedback += "</ul><h4>✅ What You Did Well:</h4><ul>";
  const good = [...scoreTracker.completed].slice(0, 3);
  for (const key of good) {
    if (gradingTemplate[key]) {
      feedback += `<li>${gradingTemplate[key].label}</li>`;
    }
  }

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
