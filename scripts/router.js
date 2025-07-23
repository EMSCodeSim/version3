// router.js

let hardcodedResponses = [];
let vectorDb = [];
window.hardcodedResponsesArray = hardcodedResponses;

// Load hardcoded responses for current scenario
export async function loadHardcodedResponses(scenarioPath) {
  const files = [
    `${scenarioPath}ems_database_part1.json`,
    `${scenarioPath}ems_database_part2.json`,
    `${scenarioPath}ems_database_part3.json`
  ];
  hardcodedResponses.length = 0;
  for (const file of files) {
    try {
      const resp = await fetch(file);
      if (!resp.ok) throw new Error(`Failed to load ${file}`);
      const obj = await resp.json();
      if (Array.isArray(obj)) {
        hardcodedResponses.push(...obj);
      } else {
        hardcodedResponses.push(...Object.values(obj));
      }
    } catch (err) {
      console.error(`Failed to load ${file}:`, err);
    }
  }
  window.hardcodedResponsesArray = hardcodedResponses;
}

// Load vector DB
export async function loadVectorDb(scenarioPath) {
  const files = [
    `${scenarioPath}vector-db-1.json`,
    `${scenarioPath}vector-db-2.json`
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

// Rephrase match via GPT-3
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

// Vector match
async function findVectorMatch(userInput, threshold = 0.40) {
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

// Tag match
function findTagMatch(message) {
  const questionTokens = new Set(normalize(message).split(/\s+/));
  let bestEntry = null;
  let bestOverlap = 0;
  for (const entry of hardcodedResponses) {
    if (Array.isArray(entry.tags) && entry.tags.length > 0) {
      const overlap = entry.tags.filter(t => questionTokens.has(normalize(t))).length;
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestEntry = entry;
      }
    }
  }
  if (bestEntry && bestOverlap > 0 && (bestEntry.response || bestEntry.answer)) {
    return bestEntry;
  }
  return null;
}

// Firebase logging
function logToFirebase({ scenarioId, question, answer, response_type }) {
  if (!window.firebase || !window.firebase.database) return;
  const timestamp = new Date().toISOString();
  const logRef = window.firebase.database().ref("ai_responses_log");
  logRef.push({ scenario_id: scenarioId, question, answer, response_type, timestamp });
}

// Unknown question log
function logUnknown({ scenarioId, question }) {
  if (!window.firebase || !window.firebase.database) return;
  const unknownRef = window.firebase.database().ref("unknownQuestions");
  unknownRef.push({ scenario_id: scenarioId, question, timestamp: new Date().toISOString() });
}

// === MATCH ORDER: exact → vector → rephrase → tag → GPT ===
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
      const answer = vectorRes.entry.response || vectorRes.entry.answer;
      logToFirebase({ scenarioId, question: message, answer, response_type: "vector" });
      return { response: answer, source: "vector", matchedEntry: vectorRes.entry };
    }
  } catch (err) {
    console.error("Vector search failed:", err);
  }

  // 3. Rephrase match
  try {
    const rephrased = await rephraseUserInput(message);
    if (rephrased) {
      const rephraseMatch = hardcodedResponses.find(entry =>
        normalize(entry.question) === normalize(rephrased) ||
        normalize(entry.userQuestion) === normalize(rephrased)
      );
      if (rephraseMatch && (rephraseMatch.response || rephraseMatch.answer)) {
        return {
          response: rephraseMatch.response || rephraseMatch.answer,
          source: "rephrase",
          matchedEntry: rephraseMatch
        };
      }
    }
  } catch (err) {
    console.error("Rephrase search failed:", err);
  }

  // 4. Tag match
  try {
    const tagEntry = findTagMatch(message);
    if (tagEntry) {
      return { response: tagEntry.response || tagEntry.answer, source: "tag", matchedEntry: tagEntry };
    }
  } catch (err) {
    console.error("Tag match failed:", err);
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

    const answer = data.reply;
    logToFirebase({ scenarioId, question: message, answer, response_type: "gpt" });
    logUnknown({ scenarioId, question: message });

    return { response: answer, source: "gpt", matchedEntry: null };
  } catch (err) {
    console.error("GPT fallback failed:", err.message);
    return { response: "❌ No response from AI.", source: "gpt", matchedEntry: null };
  }
}
