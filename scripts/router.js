// router.js

import { getDatabase, ref, get } from "firebase/database";
import { chatWithGPT4Turbo } from './gpt4-turbo.js';
import { similaritySearch } from './vector-search.js';

let hardcodedResponses = {};

export async function loadHardcodedResponses() {
  const db = getDatabase();
  const snapshot = await get(ref(db, 'hardcodedResponses'));
  if (snapshot.exists()) {
    hardcodedResponses = snapshot.val();
    console.log("Hardcoded responses loaded:", Object.keys(hardcodedResponses).length);
  } else {
    console.warn("No hardcoded responses found.");
  }
}

export async function routeUserInput(userInput, context = {}) {
  const cleanedInput = userInput.trim().toLowerCase();

  // Step 1: Exact Match (using `question`)
  for (const key in hardcodedResponses) {
    const entry = hardcodedResponses[key];
    if (entry.question && entry.question.trim().toLowerCase() === cleanedInput) {
      console.log("Matched via exact hardcoded (question)");
      return {
        response: entry.response,
        source: "hardcoded",
        role: entry.role || "Patient",
      };
    }
  }

  // Step 2: Vector similarity match
  const vectorMatch = await similaritySearch(cleanedInput);
  if (vectorMatch) {
    console.log("Matched via vector search");
    return {
      response: vectorMatch.response,
      source: "vector",
      role: vectorMatch.role || "Patient",
    };
  }

  // Step 3: GPT fallback
  const gptResponse = await chatWithGPT4Turbo(userInput, context);
  return {
    response: gptResponse,
    source: "GPT-4",
    role: context.role || "Patient",
  };
}
