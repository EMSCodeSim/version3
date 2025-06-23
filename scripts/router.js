// router.js

import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, child } from "firebase/database";

// --- STATIC HARDCODED RESPONSES ---
// You should load this synchronously before chat starts
let staticHardcoded = {};
fetch('/hardcodedResponses.json')
  .then(res => res.json())
  .then(data => staticHardcoded = data.scenarios);

let hardcodedResponses = [];
let vectorDb = [];
window.hardcodedResponsesArray = hardcodedResponses;

// --- FIREBASE INIT ---
// Replace with your Firebase config
const firebaseConfig = {
  // ...your firebase config here...
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Load hardcoded responses for current scenario (optional, legacy support) ---
export async function loadHardcodedResponses(scenarioPath) {
  // Use scenarioPath, e.g. 'scenarios/allergic_reaction_001/'
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
      // Accept array or object style
      if (Array.isArray(obj)) {
        hardcodedResponses.push(...obj);
      } else {
        hardcodedResponses.push(...Object.values(obj));
      }
    } catch (err) {
      // silent fail for optional files
    }
  }
  window.hardcodedResponsesArray = hardcodedResponses;
}

// --- Load vector DB for current scenario (unchanged) ---
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
    } catch (err) {}
  }
  window.vectorDbArray = vectorDb;
}

// --- Normalize Helper ---
function normalize(str) {
  return (str || "").trim().toLowerCase().replace(/[^\w\s]/g, "");
}

// --- Cosine Similarity Helper ---
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; ++i) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- Find in static JSON first ---
function findStaticResponse(scenarioId, userQuestion) {
  const responses = staticHardcoded[scenarioId] || [];
  return responses.find(r =>
    normalize(r.question) === normalize(userQuestion)
  );
}

// --- Firebase logging for missed Q&A ---
async function logMissToFirebase(scenarioId, userQuestion, aiResponse) {
  const safeQ = userQuestion.replace(/\./g, "_");
  const reviewRef = ref(db, `reviewQueue/${scenarioId}/${safeQ}`);
  await set(reviewRef, {
    question: userQuestion,
    aiResponse,
    timestamp: Date.now()
  });
}

// --- Main Routing Logic ---
export async function routeUserInput(message, { scenarioId, role }) {
  const norm = normalize(message);

  // 1. STATIC: Check static JSON first
  const staticMatch = findStaticResponse(scenarioId, message);
  if (staticMatch && staticMatch.answer) {
    return { response: staticMatch.answer, source: "static", matchedEntry: staticMatch };
  }

  // 2. HARDCODED (legacy support)
  const match = hardcodedResponses.find(entry =>
    normalize(entry.question) === norm ||
    normalize(entry.userQuestion) === norm
  );
  if (match && (match.response || match.answer)) {
    return { response: match.response || match.answer, source: "hardcoded", matchedEntry: match };
  }

  // 3. VECTOR
  try {
    const vectorRes = await findVectorMatch(message, 0.80);
    if (vectorRes && (vectorRes.entry.response || vectorRes.entry.answer)) {
      return {
        response: vectorRes.entry.response || vectorRes.entry.answer,
        source: "vector",
        matchedEntry: vectorRes.entry
      };
    }
  } catch (err) {}

  // 4. GPT fallback + log to Firebase
  try {
    const res = await fetch("/.netlify/functions/gpt4-turbo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message })
    });
    const data = await res.json();
    if (!res.ok || !data.reply) throw new Error(data.error || "GPT failed");

    // Log question + AI answer to Firebase for review
    await logMissToFirebase(scenarioId, message, data.reply);

    return { response: data.reply, source: "gpt", matchedEntry: null };
  } catch (err) {
    return { response: "❌ No response from AI.", source: "gpt", matchedEntry: null };
  }
}

// --- (Unchanged, add your findVectorMatch and other helpers as needed) ---
// Keep your findVectorMatch, cosineSimilarity, matchByTags, etc. functions as before.

