// router.js

let hardcodedResponses = [];
let vectorDb = [];
window.hardcodedResponsesArray = hardcodedResponses;

// Load hardcoded responses
export async function loadHardcodedResponses() {
  const base = '/scenarios/chest_pain_002/';
  const files = [
    `${base}ems_database_part1.json`,
    `${base}ems_database_part2.json`,
    `${base}ems_database_part3.json`
  ];
  hardcodedResponses.length = 0;
  for (const file of files) {
    try {
      const resp = await fetch(file);
      if (!resp.ok) throw new Error(`Failed to load ${file}`);
      const obj = await resp.json();
      hardcodedResponses.push(...Object.values(obj));
    } catch (err) {
      console.error(`Failed to load ${file}:`, err);
    }
  }
  window.hardcodedResponsesArray = hardcodedResponses;
}

// Load vector DB from two parts
export async function loadVectorDb() {
  const base = '/scenarios/chest_pain_002/';
  const files = [
    `${base}vector-db-1.json`,
    `${base}vector-db-2.json`
  ];
  vectorDb.length = 0;
  for (const file of files) {
    try {
      const resp = await fetch(file);
      if (!resp.ok) throw new Error(`Failed to load ${file}`);
      const arr = await resp.json();
      vectorDb.push(...arr);
    } catch (err) {
      console.error(`Failed to load ${file}:`, err);
    }
  }
  window.vectorDbArray = vectorDb;
}

// Normalize helper
function normalize(str) {
  return (str || "").trim().toLowerCase().replace(/[^\w\s]/g, "");
}

// Cosine similarity helper
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; ++i) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Rephrase match: call Netlify function to rephrase user input
async function rephraseUserInput(input) {
  try {
    const res = await fetch('/.netlify/functions/gpt3_rephrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });
    const data = await res.json();
    if (res.ok && data.rephrased) {
      return data.rephrased;
    }
    return null;
  } catch (err) {
    console.error("Rephrase failed:", err);
    return null;
  }
}

// Tag match (unchanged)
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

// VECTOR MATCH (calls serverless function to get embedding)
async function findVectorMatch(userInput, threshold = 0.80) {
  const embedRes = await fetch('/.netlify/functions/embed', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ input: userInput })
  });
  const { embedding } = await embedRes.json();
  if (!embedding) throw new Error('No embedding generated.');

  let bestScore = -1, bestEntry = null;
  for (const entry of vectorDb) {
    if (!entry.embedding || entry.embedding.length === 0) continue;
    const sim = cosineSimilarity(embedding, entry.embedding);
    if (sim > bestScore) {
      bestScore = sim;
      bestEntry = entry;
    }
  }
  if (bestScore >= threshold) return { entry: bestEntry, score: bestScore };
  return null;
}

// === MATCH ORDER: hardcoded → vector → rephrase → tag → GPT ===
export async function routeUserInput(message, { scenarioId, role }) {
  const norm = normalize(message);

  // 1. Exact match
  const match = hardcodedResponses.find(entry =>
    normalize(entry.question) === norm ||
    normalize(entry.userQuestion) === norm
  );
  if (match && (match.response || match.answer)) {
    return { response: match.response || match.answer, source: "hardcoded", matchedEntry: match };
  }

  // 2. Vector match
  try {
    const vectorRes = await findVectorMatch(message, 0.80);
    if (vectorRes && (vectorRes.entry.response || vectorRes.entry.answer)) {
      return {
        response: vectorRes.entry.response || vectorRes.entry.answer,
        source: "vector",
        matchedEntry: vectorRes.entry
      };
    }
  } catch (err) {
    console.error("Vector search failed:", err);
  }

  // 3. Rephrase match (uses gpt3_rephrase)
  try {
    const rephrased = await rephraseUserInput(message);
    if (rephrased) {
      const rephraseMatch = hardcodedResponses.find(entry =>
        normalize(entry.question) === normalize(rephrased) ||
        normalize(entry.userQuestion) === normalize(rephrased)
      );
      if (rephraseMatch && (rephraseMatch.response || rephraseMatch.answer)) {
        return { response: rephraseMatch.response || rephraseMatch.answer, source: "rephrase", matchedEntry: rephraseMatch };
      }
    }
  } catch (err) {
    console.error("Rephrase search failed:", err);
  }

  // 4. Tag match
  const tagMatch = matchByTags(message);
  if (tagMatch && (tagMatch.response || tagMatch.answer)) {
    return { response: tagMatch.response || tagMatch.answer, source: "tag-match", matchedEntry: tagMatch };
  }

  // 5. GPT fallback
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
