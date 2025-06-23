// router.js

import { getEmbeddings, cosineSimilarity } from './embed.js';

let hardcodedResponses = [];
let vectorDb = [];

export async function loadHardcodedResponses(scenarioPath) {
  try {
    // Load all ems_database_part*.json files in the scenario folder
    let i = 1;
    let newData = [];
    while (true) {
      try {
        const res = await fetch(`${scenarioPath}ems_database_part${i}.json`);
        if (!res.ok) break;
        const part = await res.json();
        if (Array.isArray(part)) newData = newData.concat(part);
        i++;
      } catch (err) {
        break;
      }
    }
    hardcodedResponses = newData;
  } catch (err) {
    hardcodedResponses = [];
  }
}

export async function loadVectorDb(scenarioPath) {
  try {
    let i = 1;
    let newDb = [];
    while (true) {
      try {
        const res = await fetch(`${scenarioPath}vector-db-${i}.json`);
        if (!res.ok) break;
        const part = await res.json();
        if (Array.isArray(part)) newDb = newDb.concat(part);
        i++;
      } catch (err) {
        break;
      }
    }
    vectorDb = newDb;
  } catch (err) {
    vectorDb = [];
  }
}

async function matchHardcoded(userMessage, scenarioId) {
  return (
    hardcodedResponses.find(entry =>
      entry.question &&
      typeof entry.question === "string" &&
      entry.question.trim().toLowerCase() === userMessage.trim().toLowerCase()
    ) || null
  );
}

async function matchVector(userMessage, scenarioId) {
  if (!vectorDb.length) return null;
  try {
    const userEmbedding = await getEmbeddings(userMessage);
    let best = { score: -1, entry: null };
    for (const entry of vectorDb) {
      if (entry.embedding) {
        const sim = cosineSimilarity(userEmbedding, entry.embedding);
        if (sim > best.score) {
          best = { score: sim, entry };
        }
      }
    }
    // Adjust threshold as desired
    if (best.score >= 0.86) return best.entry;
    return null;
  } catch (err) {
    return null;
  }
}

// Rephrase match (Netlify function)
async function matchByRephrase(userMessage, scenarioId) {
  try {
    const res = await fetch('/.netlify/functions/gpt3_rephrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: userMessage, scenarioId })
    });
    if (!res.ok) return null;
    const { match } = await res.json();
    return match || null;
  } catch {
    return null;
  }
}

// GPT fallback (Netlify function)
async function getGPTResponse(userMessage, scenarioId, role = "patient") {
  try {
    const res = await fetch('/.netlify/functions/gpt4-turbo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: userMessage, role, scenarioId })
    });
    if (!res.ok) throw new Error("GPT call failed");
    const { reply } = await res.json();
    return reply || "I'm not sure how to answer that.";
  } catch {
    return "I'm not sure how to answer that.";
  }
}

export async function routeUserInput(userMessage, { scenarioId, role = "patient" }) {
  // 1. Hardcoded match
  const hardcodedMatch = await matchHardcoded(userMessage, scenarioId);
  if (hardcodedMatch) {
    return {
      response: hardcodedMatch.answer,
      source: "hardcoded",
      matchedEntry: hardcodedMatch
    };
  }

  // 2. Vector match
  const vectorMatch = await matchVector(userMessage, scenarioId);
  if (vectorMatch) {
    return {
      response: vectorMatch.answer,
      source: "vector",
      matchedEntry: vectorMatch
    };
  }

  // 3. Rephrase match
  const rephraseMatch = await matchByRephrase(userMessage, scenarioId);
  if (rephraseMatch) {
    return {
      response: rephraseMatch.answer,
      source: "rephrase",
      matchedEntry: rephraseMatch
    };
  }

  // 4. Fallback to GPT (and log)
  const gptResponse = await getGPTResponse(userMessage, scenarioId, role);
  return {
    response: gptResponse,
    source: "gpt4-turbo",
    matchedEntry: null
  };
}
