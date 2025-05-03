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

  // Example: critical fail logic
  if (lower.includes("no gloves")) {
    scoreTracker.criticalFails.push("Did not apply PPE");
  }
}

async function generateImprovementTips(missedLabels) {
  const prompt = `You are an EMT trainer. The student missed the following items during an EMT medical assessment: ${missedLabels.join(", ")}. Give 2 to 4 short friendly improvement tips.`;

  const res = await fetch('/api/gpt4-turbo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: prompt })
  });

  const data = await res.json();
  return data.reply || "Keep practicing — you'll improve with each run!";
}

export async function gradeScenario() {
  let score = 0;
  let rows = [];

  for (let key in gradingTemplate) {
    if (key === "criticalFails") continue;
    const label = gradingTemplate[key].label || key;
    const points = gradingTemplate[key].points || 1;
    const earned = !!scoreTracker[key];
    if (earned) score += points;
    rows.push({ label, earned });
  }

  const total = rows.length;
  const missed = rows.filter(r => !r.earned).map(r => r.label);
  const criticalFails = scoreTracker.criticalFails;

  const tips = await generateImprovementTips(missed);

  const listItems = rows.map(row =>
    `<li>${row.earned ? '✅' : '❌'} ${row.label}</li>`
  ).join("");

  const feedbackText = `
    <strong>Score:</strong> ${score}/${total}<br><br>
    ${criticalFails.length > 0 ? `<strong>Critical Fails:</strong><br>❌ ${criticalFails.join("<br>")}<br><br>` : ""}
    <strong>Skill Breakdown:</strong><br>
    <ul style="list-style-type: none; padding-left: 0;">${listItems}</ul>
    <br><strong>Tips for Improvement:</strong><br>
    ${tips}
  `;

  return { score, feedbackText };
}
