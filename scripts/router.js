// router.js

import { getRephrasedInput } from './gpt3_rephrase.js';
import { hardcodedResponses } from './hardcodedResponses.js';
import { getGPTResponse } from './gpt_fallback.js'; // fallback GPT (e.g., 4-turbo or 3.5)

// Main router function
export async function routeUserInput(userInput, context) {
  // Step 1: Rephrase input using GPT-3.5
  const rephrasedInput = await getRephrasedInput(userInput);

  // Step 2: Try exact match
  if (hardcodedResponses[rephrasedInput.toLowerCase()]) {
    return {
      response: hardcodedResponses[rephrasedInput.toLowerCase()],
      source: 'hardcoded'
    };
  }

  // Step 3: Try fuzzy match (contains key)
  for (let key in hardcodedResponses) {
    if (rephrasedInput.toLowerCase().includes(key.toLowerCase())) {
      return {
        response: hardcodedResponses[key],
        source: 'hardcoded (fuzzy match)'
      };
    }
  }

  // Step 4: Fallback to GPT if no match
  const fallbackResponse = await getGPTResponse(rephrasedInput, context);
  return {
    response: fallbackResponse,
    source: 'gpt_fallback'
  };
}
