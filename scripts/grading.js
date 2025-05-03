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

export async function gradeScenario() {
  const missedItems = Object.keys(gradingTemplate).filter(k => !scoreTracker.completed.has(k));
  const totalPossible = Object.values(gradingTemplate).reduce((sum, item) => sum + item.points, 0);
  const totalScore = scoreTracker.points;

  const passedItems = Array.from(scoreTracker.completed).map(k => gradingTemplate[k]?.label);
  const criticals = findCriticalFailures(scoreTracker.userInputs);

  const prompt = `
You are a certified NREMT evaluator. A student just completed a medical patient assessment simulation.

Give them personalized performance feedback based on the following:

Score: ${totalScore} out of ${totalPossible}

Things they did well:
${passedItems.length ? passedItems.map(i => "- " + i).join("\n") : "None"}

Things they missed:
${missedItems.length ? missedItems.map(k => "- " + gradingTemplate[k]?.label).join("\n") : "None"}

Critical Failures:
${criticals.length ? criticals.map(f => "- " + f).join("\n") : "None"}

Please respond in this format:
**Summary:** (Brief summary of how they did)  
**What You Did Well:** (3–5 things)  
**Improvement Tips:** (2–3 specific tips)  
${criticals.length ? "**Critical Failures:** (List and short explanation)" : ""}
Use a professional and encouraging tone.
`;

  try {
    const res = await fetch('/api/gpt4-turbo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: prompt })
    });

    const data = await res.json();
    return data.reply || `Score: ${totalScore} / ${totalPossible} (AI feedback unavailable)`;
  } catch (e) {
    console.error("GPT feedback error:", e.message);
    return `Score: ${totalScore} / ${totalPossible} (Feedback system offline)`;
  }
}

function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/gi, '').trim();
}

function findCriticalFailures(inputs) {
  const found = [];

  for (const rule of criticalFailures) {
    if (rule.keywords.length === 0 && rule.id === "timeout") {
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
