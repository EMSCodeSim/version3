// scripts/router.js

import { initializeApp } from "firebase/app";
import { getDatabase, ref, push } from "firebase/database";

// ==== FIREBASE CONFIGURATION ====
// Replace these values with your actual Firebase project details!
const firebaseConfig = {
  apiKey: "AIzaSyD-YourApiKeyHere",
  authDomain: "ems-code-sim.firebaseapp.com",
  databaseURL: "https://ems-code-sim-default-rtdb.firebaseio.com",
  projectId: "ems-code-sim",
  storageBucket: "ems-code-sim.appspot.com",
  messagingSenderId: "1074994257470",
  appId: "1:1074994257470:web:yourappid"
};
const app = initializeApp(firebaseConfig);

// ==== REPHRASE WITH GPT-3.5 ====
async function rephraseWithGPT3(userInput) {
  try {
    const response = await fetch('/.netlify/functions/gpt3_rephrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: userInput })
    });
    const data = await response.json();
    if (data.result) return data.result.trim().toLowerCase();
    return userInput.trim().toLowerCase();
  } catch (e) {
    return userInput.trim().toLowerCase();
  }
}

// ==== GET HARDCODED RESPONSE ====
import { getHardcodedResponse } from "./hardcodedsearch"; // Plug in your function here

// ==== GET GPT-4 TURBO RESPONSE ====
import { getGpt4TurboResponse } from "./gpt4_turbo"; // Plug in your function here

// ==== LOG FOR ADMIN REVIEW IN FIREBASE ====
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

// ==== MAIN ROUTER FUNCTION ====
export async function processUserInput(userInput, context = {}) {
  // 1. Rephrase user input
  const rephrasedInput = await rephraseWithGPT3(userInput);

  // 2. Try to find a hardcoded response
  let hardcodeResponse = await getHardcodedResponse(rephrasedInput);

  if (hardcodeResponse) {
    return {
      response: hardcodeResponse,
      source: 'hardcode',
      rephrased: rephrasedInput
    };
  }

  // 3. No match: Get GPT-4 Turbo answer
  const gpt4Answer = await getGpt4TurboResponse(rephrasedInput, context);

  // 4. Log for admin approval in Firebase
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

export default processUserInput;
