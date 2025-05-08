let hardcodedResponses = {};

// Load hardcoded responses from Firebase
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

  // 1. Exact match
  const exact = findHardcodedMatch(input);
  if (exact) {
    return { response: exact, source: "hardcoded" };
  }

  // 2. GPT-3.5 rephrase + match
  const rephrased = await rephraseWithGPT35(input);
  if (rephrased) {
    const matched = findHardcodedMatch(rephrased.toLowerCase());
    if (matched) {
      return { response: matched, source: "rephrased" };
    }
  }

  // 3. Vector search
  const vectorMatch = await getVectorResponse(input);
  if (vectorMatch) {
    return { response: vectorMatch, source: "vector" };
  }

  // 4. GPT-4 fallback
  const fallback = await getAIResponseGPT4Turbo(input, context);
  if (fallback) {
    logGPTResponseToDatabase(input, fallback, context);
    return { response: fallback, source: "gpt-4" };
  }

  return { response: "I'm not sure how to respond to that.", source: "none" };
}

// Check for hardcoded match
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
    const res = await fetch('/.netlify/functions/gpt-3.5-rephrase', {
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

// Vector search call to external server
async function getVectorResponse(input) {
  try {
    const res = await fetch('https://super-duper-carnival-q76675jxj9p5h6495-5000.app.github.dev/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: input })
    });
    const data = await res.json();
    return data.matched_question || null;
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

// Logging fallback GPT answers for approval
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
