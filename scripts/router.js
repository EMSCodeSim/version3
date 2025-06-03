// router.js

// Hardcoded responses array (loaded from JSON files)
let hardcodedResponses = [];
window.hardcodedResponsesArray = hardcodedResponses; // For global access if needed

// Load responses from three JSON files in /scenarios/chest_pain_002/
export async function loadHardcodedResponses() {
  const base = '/scenarios/chest_pain_002/';
  const files = [
    `${base}ems_database_part1.json`,
    `${base}ems_database_part2.json`,
    `${base}ems_database_part3.json`
  ];

  hardcodedResponses.length = 0; // Clear
  for (const file of files) {
    try {
      const resp = await fetch(file);
      if (!resp.ok) throw new Error(`Failed to load ${file}`);
      const obj = await resp.json();
      // Each file is an object: {id: {...}, ...}
      hardcodedResponses.push(...Object.values(obj));
    } catch (err) {
      console.error(`Failed to load ${file}:`, err);
    }
  }
  window.hardcodedResponsesArray = hardcodedResponses;
}

// Helper to normalize
function normalize(str) {
  return (str || "").trim().toLowerCase().replace(/[^\w\s]/g, "");
}

// Alias match
function matchByAlias(userInput) {
  const norm = normalize(userInput);
  for (const entry of hardcodedResponses) {
    if (Array.isArray(entry.aliases) && entry.aliases.some(a => normalize(a) === norm)) {
      return entry;
    }
  }
  return null;
}

// Tag match
function matchByTags(userInput) {
  const norm = normalize(userInput);
  for (const entry of hardcodedResponses) {
    if (!entry.tags || !Array.isArray(entry.tags)) continue;
    if (entry.tags.some(tag => norm.includes(tag.toLowerCase()))) {
      return entry;
    }
  }
  return null;
}

export async function routeUserInput(message, { scenarioId, role }) {
  const norm = normalize(message);

  // 1. Exact match on question or userQuestion
  const match = hardcodedResponses.find(entry =>
    normalize(entry.question) === norm ||
    normalize(entry.userQuestion) === norm
  );
  if (match && (match.response || match.answer)) {
    return { response: match.response || match.answer, source: "hardcoded", matchedEntry: match };
  }

  // 2. Alias match
  const aliasMatch = matchByAlias(message);
  if (aliasMatch && (aliasMatch.response || aliasMatch.answer)) {
    return { response: aliasMatch.response || aliasMatch.answer, source: "alias", matchedEntry: aliasMatch };
  }

  // 3. Tag match
  const tagMatch = matchByTags(message);
  if (tagMatch && (tagMatch.response || tagMatch.answer)) {
    return { response: tagMatch.response || tagMatch.answer, source: "tag-match", matchedEntry: tagMatch };
  }

  // 4. GPT fallback
  try {
    const res = await fetch("/.netlify/functions/gpt4-turbo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message })
    });

    const data = await res.json();
    if (!res.ok || !data.reply) throw new Error(data.error || "GPT failed");
    return { response: data.reply, source: "gpt", matchedEntry: null };
  } catch (err) {
    console.error("GPT fallback failed:", err.message);
    return { response: "❌ No response from AI.", source: "gpt", matchedEntry: null };
  }
}
