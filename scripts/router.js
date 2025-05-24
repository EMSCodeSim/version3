import { searchHardcoded, searchVectors } from './hardcode_search.js';
import { rephraseWithGPT3 } from './gpt3_rephrase.js';

export async function routeUserInput(message, context) {
  console.log("Routing user input (original):", message);

  // Step 1: Rephrase using GPT-3.5
  const rephrased = await rephraseWithGPT3(message);
  console.log("Rephrased input:", rephrased);

  // Step 2: Try hardcoded match
  const hardcoded = await searchHardcoded(rephrased, context.role);
  if (hardcoded) {
    return {
      response: hardcoded.response,
      source: "hardcoded"
    };
  }

  // Step 3: Try vector search
  const vectorMatch = await searchVectors(rephrased, context.role);
  if (vectorMatch) {
    return {
      response: vectorMatch.response,
      source: "vector"
    };
  }

  // Step 4: Fallback to GPT-4 with rephrased input
  const data = await fetch("/.netlify/functions/gpt4_router", {
    method: "POST",
    body: JSON.stringify({
      content: rephrased,
      role: context.role,
      scenarioId: context.scenarioId || "",
      history: context.history || []
    })
  }).then(res => res.json());

  console.log("GPT fallback using:", rephrased);

  return {
    response: data.reply,
    source: "gpt4"
  };
}
