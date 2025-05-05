let hardcodedResponses = {};

// Load all hardcoded responses from Firebase once at start
export async function loadHardcodedResponses() {
  try {
    const snapshot = await firebase.database().ref('hardcodedResponses').once('value');
    hardcodedResponses = snapshot.val() || {};
    console.log("✅ Hardcoded responses loaded.");
  } catch (error) {
    console.error("❌ Error loading hardcoded responses:", error);
  }
}

// Main router function
export async function routeUserInput(userInput, context = {}) {
  const input = userInput.trim().toLowerCase();

  // 1. Exact match
  const exact = findHardcodedMatch(input);
  if (exact) {
    return { response: exact, source: "hardcoded" };
  }

  // 2. Rephrase with GPT-3.5
  const rephrased = await rephraseWithGPT35(input);
  if (rephrased) {
    const matched = findHardcodedMatch(rephrased.toLowerCase());
    if (matched) {
      return { response: matched, source: "rephrased" };
    }
  }

  // 3. GPT-4 fallback
  const fallback = await getAIResponseGPT4Turbo(input, context);
  if (fallback) {
    logGPTResponseToDatabase(input, fallback, context);
    return { response: fallback, source: "gpt-4" };
  }

  return { response: "I'm not sure how to respond to that.", source: "fallback" };
}

// Internal match finder
function findHardcodedMatch(input) {
  for (const key in hardcodedResponses) {
    const stored = hardcodedResponses[key];
    if (stored?.userQuestion?.trim().toLowerCase() === input) {
      return stored.aiResponse;
    }
  }
  return null;
}

// GPT-3.5 rephrase call
async function rephraseWithGPT35(input) {
  try {
    const res = await fetch('/api/gpt-3.5-rephrase', {
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

// GPT-4 Turbo fallback call
async function getAIResponseGPT4Turbo(input, context) {
  try {
    const res = await fetch('/api/gpt4-turbo', {
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

// Log to Firebase for admin review
function logGPTResponseToDatabase(input, reply, context) {
  const logRef = firebase.database().ref("unmatchedLog").push();
  const entry = {
    timestamp: Date.now(),
    userInput: input,
    gptReply: reply,
    context: context
  };
  logRef.set(entry);
}
