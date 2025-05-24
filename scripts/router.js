// scripts/router.js

import { initializeApp } from "firebase/app";
import { getDatabase, ref, push } from "firebase/database";

// Initialize Firebase (use your own config here!)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DB_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
const app = initializeApp(firebaseConfig);

// Helper: Send user input to GPT-3.5 rephrase endpoint
async function rephraseWithGPT3(userInput) {
  try {
    const response = await fetch('/.netlify/functions/gpt3_rephrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: userInput })
    });
    const data = await response.json();
    if (data.result) return data.result.trim().toLowerCase();
    return userInput.trim().toLowerCase(); // fallback
  } catch (e) {
    return userInput.trim().toLowerCase();
  }
}

// Helper: Search for a hardcoded response (implement or import as needed)
import { getHardcodedResponse } from "./hardcodedsearch"; // Your own function

// Helper: Get GPT-4 Turbo answer (implement or import as needed)
import { getGpt4TurboResponse } from "./gpt4_turbo"; // Your own function

// Helper: Log for admin review in Firebase
async function logForAdminReview({ originalInput, rephrasedInput, gpt4Response, context }) {
  const db = getDatabase();
  const reviewRef = ref(db, 'hardcodedReview');
  await push(reviewRef, {
    originalInput,
    rephrasedInput,
    gpt4Response,
    context: context || {},
    timestamp: Date.now()
  });
}

// === MAIN ROUTER FUNCTION ===
export async function processUserInput(userInput, context = {}) {
  // 1. Rephrase
  const rephrasedInput = await rephraseWithGPT3(userInput);

  // 2. Hardcoded match
  let hardcodeResponse = await getHardcodedResponse(rephrasedInput);

  if (hardcodeResponse) {
    return {
      response: hardcodeResponse,
      source: 'hardcode',
      rephrased: rephrasedInput
    };
  }

  // 3. No match, use GPT-4 Turbo
  const gpt4Answer = await getGpt4TurboResponse(rephrasedInput, context);

  // 4. Log for admin approval
  await logForAdminReview({
    originalInput: userInput,
    rephrasedInput,
    gpt4Response: gpt4Answer,
    context
  });

  // 5. Return GPT-4 response to user
  return {
    response: gpt4Answer,
    source: 'gpt4',
    rephrased: rephrasedInput
  };
}

// Export for other scripts
export default processUserInput;
