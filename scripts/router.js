let hardcodedResponses = {};

// Load hardcoded responses from Firebase once at start
export async function loadHardcodedResponses() {
  try {
    const snapshot = await firebase.database().ref('hardcodedResponses').once('value');
    hardcodedResponses = snapshot.val() || {};
    console.log("✅ Hardcoded responses loaded.");
  } catch (error) {
    console.error("❌ Error loading hardcoded responses:", error);
  }
}

// Main router logic
export async function routeUserInput(userInput, context = {}) {
  const input = userInput.trim().toLowerCase();

  // 1. Hardcoded exact match
  const exact = findHardcodedMatch(input);
  if (exact) {
    return { response: exact, source: "hardcoded" };
  }

  // 2. Rephrase and retry hardcoded
  const rephrased = await rephraseWithGPT35(input);
  if (rephrased) {
    const matched = findHardcodedMatch(rephrased.toLowerCase());
    if (matched) {
      return { response: matched, source: "rephrased" };
    }
  }

  // 3. Vector fallback
  const vector = await getVectorResponse(input);
  if (vector) {
    logUnapprovedGPTAnswer(input, vector, "vector");
    return { response: vector, source: "vector" };
  }

  // 4. GPT-4 fallback
  const fallback = await getAIResponseGPT4Turbo(input, context);
  if (fallback) {
    logUnapprovedGPTAnswer(input, fallback, "gpt-4");
    return { response: fallback, source: "gpt-4" };
  }

  return { response: "No response available.", source: "none" };
}

// Hardcoded matcher
function findHardcodedMatch(input) {
  for (const key in hardcodedResponses) {
    const stored = hardcodedResponses[key];
    if (stored?.userQuestion?.trim().toLowerCase() === input) {
      return stored.aiResponse;
    }
  }
  return null;
}

// Rephrase with GPT-3.5
async function rephraseWithGPT35(input) {
  try {
    const res = await fetch('/.netlify/functions/gpt3_rephrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });
    const data = await res.json();
    return data.rephrased || null;
  } catch (e) {
    console.error("❌ GPT-3.5 rephrase failed:", e);
    return null;
  }
}

// Vector search
async function getVectorResponse(input) {
  try {
    const res = await fetch('/.netlify/functions/vector-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: input })
    });
    const data = await res.json();
    return data.match || null;
  } catch (e) {
    console.error("❌ Vector search failed:", e);
    return null;
  }
}

// GPT-4 Turbo fallback
async function getAIResponseGPT4Turbo(input, context) {
  try {
    const res = await fetch('/.netlify/functions/gpt4-turbo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input, context })
    });
    const data = await res.json();
    return data.reply || null;
  } catch (e) {
    console.error("❌ GPT-4 fallback failed:", e);
    return null;
  }
}

// Log GPT-based answers to review queue
function logUnapprovedGPTAnswer(input, response, source) {
  const ref = firebase.database().ref("hardcodedReview").push();
  ref.set({
    userQuestion: input,
    aiResponse: response,
    approved: false,
    source: source,
    timestamp: Date.now()
  });
}
