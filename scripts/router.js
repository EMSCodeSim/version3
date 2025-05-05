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

// Normalize input and stored strings
function normalize(text) {
  return text.trim().toLowerCase().replace(/[^\w\s]/g, '');
}

// Internal match finder using normalized text
function findHardcodedMatch(input) {
  const normInput = normalize(input);
  for (const key in hardcodedResponses) {
    const stored = hardcodedResponses[key];
    const normStored = normalize(stored?.userQuestion || '');
    if (normStored === normInput) {
      return stored.aiResponse;
    }
  }
  return null;
}

// GPT-3.5 rephrase call
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

// Log GPT-4 fallback to Firebase for admin review
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

// Main router function
export async function routeUserInput(userInput, context = {}) {
  const input = userInput.trim();

  // 1. Exact match
  console.log("🔍 Checking exact match for:", input);
  const exact = findHardcodedMatch(input);
  if (exact) {
    console.log("✅ Exact match found.");
    return { response: exact, source: "hardcoded" };
  }

  // 2. Rephrase with GPT-3.5
  console.log("🔁 Trying GPT-3.5 rephrase for:", input);
  const rephrased = await rephraseWithGPT35(input);
  console.log("📝 Rephrased to:", rephrased);
  if (rephrased) {
    const matched = findHardcodedMatch(rephrased);
    if (matched) {
      console.log("✅ Rephrased match found.");

      // ✅ Save the rephrased input to Firebase
      const newRef = firebase.database().ref("hardcodedResponses").push();
      newRef.set({
        userQuestion: rephrased,
        aiResponse: matched
      });
      console.log("💾 Rephrased entry saved to Firebase:", rephrased);

      return { response: matched, source: "rephrased" };
    }
  }

  // 3. GPT-4 fallback
  console.log("⚠️ No match found, using GPT-4 fallback.");
  const fallback = await getAIResponseGPT4Turbo(input, context);
  if (fallback) {
    logGPTResponseToDatabase(input, fallback, context);
    return { response: fallback, source: "gpt-4" };
  }

  return { response: "I'm not sure how to respond to that.", source: "fallback" };
}
