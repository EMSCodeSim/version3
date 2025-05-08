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

// Main router function
export async function routeUserInput(userInput, context = {}) {
  const input = userInput.trim().toLowerCase();

  // 1. Exact match
  const exact = findHardcodedMatch(input);
  if (exact) {
    return { response: exact, source: "hardcoded" };
  }

  // 2. Rephrase with GPT-3.5 and check again
  const rephrased = await rephraseWithGPT35(input);
  if (rephrased) {
    const matched = findHardcodedMatch(rephrased.toLowerCase());
    if (matched) {
      return { response: matched, source: "rephrased" };
    }
  }

  // ✅ 3. Vector search
  const vector = await getVectorResponse(input);
  if (vector) {
    return { response: vector, source: "vector" };
  }

  // 4. GPT-4 Turbo fallback
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
    console.log("Rephrasing with GPT-3.5:", input);
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


// ✅ Vector search logic
async function getVectorResponse(input) {
  try {
    const res = await fetch('/api/vector-search', {
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

// GPT-4 fallback logic
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

// Log fallback to Firebase for future approval
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
