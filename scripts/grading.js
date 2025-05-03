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
  const totalScore = scoreTracker.points;
  const passedItems = Array.from(scoreTracker.completed).map(k => gradingTemplate[k]?.label);
  const criticals = findCriticalFailures(scoreTracker.userInputs);

  const allItems = Object.keys(gradingTemplate).map(k => ({
    id: k,
    label: gradingTemplate[k].label,
    points: gradingTemplate[k].points,
    earned: scoreTracker.completed.has(k)
  }));

  const prompt = `
You are an NREMT evaluator. Generate professional, specific, and constructive feedback for a student.

Score: ${totalScore} / 48
Successes:
${passedItems.map(i => "- " + i).join("\n") || "None"}
Missed:
${missedItems.map(k => "- " + gradingTemplate[k]?.label).join("\n") || "None"}
Critical Failures:
${criticals.length ? criticals.map(f => "- " + f).join("\n") : "None"}

Provide a summary, list what was done well, and offer clear improvement suggestions.
Avoid repeating the numeric score in your response.
`;

  let gptFeedback = "";
  try {
    const res = await fetch('/api/gpt4-turbo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: prompt })
    });
    const data = await res.json();
    gptFeedback = data.reply || "(No GPT feedback returned)";
  } catch (e) {
    console.error("GPT feedback error:", e.message);
    gptFeedback = "(GPT feedback unavailable)";
  }

  const tips = missedItems
    .map(k => improvementTips[k])
    .filter(Boolean)
    .flat()
    .slice(0, 3);

  return {
    score: totalScore,
    positives: passedItems,
    improvementTips: tips.length ? tips : ["Review OPQRST thoroughly.", "Ensure scene safety and PPE are clearly stated."],
    criticalFails: criticals,
    gptFeedback,
    allItems
  };
}

function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/gi, '').trim();
}

function findCriticalFailures(inputs) {
  const found = [];
  for (const rule of criticalFailures) {
    if (!rule.keywords?.length || !rule.reason) continue;
    for (const userInput of inputs) {
      const match = rule.keywords.some(keyword =>
        userInput.includes(keyword.toLowerCase())
      );
      if (match) {
        found.push(rule.reason);
        break;
      }
    }
  }
  return found;
}
