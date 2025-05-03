let gradingTemplate = {};
let scoreTracker = {};

export async function initializeScoreTracker(type = "medical") {
  const res = await fetch(`grading_templates/${type}_assessment.json`);
  gradingTemplate = await res.json();
  scoreTracker = {};
  Object.keys(gradingTemplate).forEach(key => {
    scoreTracker[key] = false;
  });
  scoreTracker.criticalFails = [];
}

export function updateScoreTracker(input) {
  const lower = input.toLowerCase();
  for (let key in gradingTemplate) {
    const keywords = gradingTemplate[key].keywords || [];
    if (keywords.some(word => lower.includes(word))) {
      scoreTracker[key] = true;
    }
  }

  // Example: critical fail if user says “no gloves”
  if (lower.includes("no gloves")) {
    scoreTracker.criticalFails.push("Did not apply PPE");
  }
}

export async function gradeScenario() {
  let score = 0;
  let allItems = [];

  for (let key in gradingTemplate) {
    if (key === "criticalFails") continue;
    const label = gradingTemplate[key].label || key;
    const points = gradingTemplate[key].points || 1;
    const earned = !!scoreTracker[key];
    if (earned) score += points;
    allItems.push({ label, points, earned });
  }

  const total = allItems.reduce((sum, i) => sum + i.points, 0);
  const positives = allItems.filter(i => i.earned).map(i => i.label);
  const missed = allItems.filter(i => !i.earned).map(i => i.label);

  const feedbackText = `
    <strong>Score:</strong> ${score}/${total}<br>
    ${scoreTracker.criticalFails.length ? `<strong>Critical Fails:</strong><br>❌ ${scoreTracker.criticalFails.join("<br>")}` : ""}
    <br><br><strong>What You Did Well:</strong><br>✅ ${positives.join("<br>")}
    <br><br><strong>What to Improve:</strong><br>⚠️ ${missed.join("<br>")}
  `;

  return { score, positives, missed, criticalFails: scoreTracker.criticalFails, feedbackText };
}
