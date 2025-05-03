import { checkHardcodedResponse } from './hardcoded.js';

const proctorKeywords = [
  "scene safe", "bsi", "gloves", "ppe", "mechanism of injury", "nature of illness", "noi", "moi",
  "how many patients", "additional resources", "call for help", "c-spine", "spinal immobilization",
  "blood pressure", "pulse", "respiratory rate", "respiratory quality", "pulse ox", "oxygen saturation",
  "blood glucose", "temperature", "avpu",
  "administering oxygen", "starting cpr", "using aed", "administering", "asa", "epipen", "glucose",
  "splint", "tourniquet", "dressing", "transport decision", "time elapsed"
];

// Normalize text
function normalize(text) {
  return text.trim().toLowerCase().replace(/[^\w\s]/g, '');
}

// Check if question matches Proctor responsibility
function isProctorQuestion(message) {
  const norm = normalize(message);
  return proctorKeywords.some(kw => norm.includes(kw));
}

// Main router
export async function routeMessage(message, vectorSearch, gptSearch, displayChatResponse) {
  const role = isProctorQuestion(message) ? "🧑‍⚕️ Proctor" : "🧍 Patient";

  // 1. Hardcoded
  const hardcoded = checkHardcodedResponse(message);
  if (hardcoded?.aiResponse) {
    return displayChatResponse(hardcoded.aiResponse, message, role, hardcoded.audioUrl || null);
  }

  // 2. Vector search fallback
  const vector = await vectorSearch(message);
  if (vector) {
    return displayChatResponse(vector, message, role);
  }

  // 3. GPT fallback
  const gpt = await gptSearch(message);
  if (gpt) {
    firebase.database().ref('unknownQuestions').push({
      userQuestion: message,
      aiResponse: gpt,
      role,
      reviewed: false,
      timestamp: Date.now()
    });
    return displayChatResponse(gpt, message, role);
  }

  return displayChatResponse("I'm not sure how to answer that right now. Your question has been logged for review.", message, role);
}
