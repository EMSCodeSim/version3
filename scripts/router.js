// router.js

import { getRephrasedInput } from './gpt3_rephrase.js';
import { fetchHardcodedResponses } from './firebase_helpers.js';
import { getGPTResponse } from './gpt_fallback.js';

let hardcodedCache = {}; // in-memory cache

// Call this once on startup
export async function loadHardcodedResponses() {
  hardcodedCache = await fetchHardcodedResponses();
  console.log("Loaded hardcoded responses:", Object.keys(hardcodedCache).length);
}

export async function routeUserInput(userInput, context) {
  const rephrasedInput = await getRephrasedInput(userInput);
  const key = rephrasedInput.toLowerCase();

  if (hardcodedCache[key]) {
    return {
      response: hardcodedCache[key].reply,
      source: 'hardcoded'
    };
  }

  for (let k in hardcodedCache) {
    if (key.includes(k)) {
      return {
        response: hardcodedCache[k].reply,
        source: 'hardcoded (fuzzy match)'
      };
    }
  }

  const fallbackResponse = await getGPTResponse(rephrasedInput, context);
  return {
    response: fallbackResponse,
    source: 'gpt_fallback'
  };
}
