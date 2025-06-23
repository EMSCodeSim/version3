// router.js

import { getEmbeddings, cosineSimilarity } from './embed.js';

// These will be loaded at scenario start
let hardcodedResponses = [];
let vectorDb = [];

// Loads scenario hardcoded DB
export async function loadHardcodedResponses(scenarioPath) {
  try {
    let i = 1;
    let all = [];
    while (true) {
      const file = `${scenarioPath}ems_database_part${i}.json`;
      const res = await fetch(file);
      if (!res.ok) break;
      const part = await res.json();
      if (Array.isArray(part)) all = all.concat(part);
      i++;
    }
    hardcodedResponses = all;
  } catch (err) {
    hardcodedResponses = [];
  }
}

// Loads scenario vector DB
export async function loadVectorDb(scenarioPath) {
  try {
    let i = 1;
    let all = [];
    while (true) {
      const file = `${scenarioPath}vector-db-${i}.json`;
      const res = await fetch(file);
      if (!res.ok) break;
      const part = await res.json();
      if (Array.isArray(part)) all = all.concat(part);
      i++;
    }
    vectorDb = all;
  } catch (err) {
    vectorDb = [];
  }
}

// Exact match (case-insensitive, trimmed)
async function matchHardcoded(userMessage) {
  const norm = userMessage.trim().toLowerCase();
  return hardcodedResponses.find(
    entry => entry.question && entry.question.trim().toLowerCase() === norm
  ) || null;
}

// Vector match
async function matchVector(userMessage) {
  if (!vectorDb.length) return null;
  try {
    const userEmbedding = await getEmbeddings(userMessage);
    let best = { score: -1, entry: null };
    for (const entry of vectorDb) {
      if (entry.embedding) {
        const sim = cosineSimilarity(userEmbedding, entry.embedding);
        if (sim > best.score) best = { score: sim, entry };
      }
    }
    // Threshold: adjust as needed
    if (best.score >= 0.86) return best.entry;
    return null;
  } catch {
    return null;
  }
}

// Rephrase match (optional: you can remove this section too)
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

// GPT fallback
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
  // 1. Hardcoded
  const hardcodedMatch = await matchHardcoded(userMessage);
  if (hardcodedMatch) {
    return {
      response: hardcodedMatch.answer,
      source: "hardcoded",
      matchedEntry: hardcodedMatch
    };
  }

  // 2. Vector
  const vectorMatch = await matchVector(userMessage);
  if (vectorMatch) {
    return {
      response: vectorMatch.answer,
      source: "vector",
      matchedEntry: vectorMatch
    };
  }

  // 3. Rephrase (can be removed if not wanted)
  const rephraseMatch = await matchByRephrase(userMessage, scenarioId);
  if (rephraseMatch) {
    return {
      response: rephraseMatch.answer,
      source: "rephrase",
      matchedEntry: rephraseMatch
    };
  }

  // 4. GPT
  const gptResponse = await getGPTResponse(userMessage, scenarioId, role);
  return {
    response: gptResponse,
    source: "gpt4-turbo",
    matchedEntry: null
  };
}
