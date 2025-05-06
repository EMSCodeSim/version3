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

function normalize(text) {
  return text.trim().toLowerCase().replace(/[^\w\s]/g, '');
}

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

async function classifyIntentWithGPT35(input) {
  try {
    const res = await fetch('/.netlify/functions/gpt3_intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });
    const data = await res.json();
    return data.intent || null;
  } catch (e) {
    console.error("❌ GPT-3.5 intent classification failed:", e);
    return null;
  }
}

async function getApprovedMatchByIntent(intent) {
  const snapshot = await firebase.database().ref("hardcodedResponses").once("value");
  const data = snapshot.val();
  for (const key in data) {
    const entry = data[key];
    if (entry.approved && entry.tags && entry.tags.includes(intent)) {
      return entry.aiResponse;
    }
  }
  return null;
}

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

// Main router
export async function routeUserInput(userInput, context = {}) {
  const input = userInput.trim();

  // 1. Check exact match
  console.log("🔍 Checking exact match for:", input);
  const exact = findHardcodedMatch(input);
  if (exact) {
    console.log("✅ Exact match found.");
    return { response: exact, source: "hardcoded" };
  }

  // 2. Try rephrasing for a match
  console.log("🔁 Rephrasing...");
  const rephrased = await rephraseWithGPT35(input);
  console.log("📝 Rephrased to:", rephrased);
  if (rephrased) {
    const match = findHardcodedMatch(rephrased);
    if (match) {
      const ref = firebase.database().ref("hardcodedResponses").push();
      ref.set({ userQuestion: rephrased, aiResponse: match, approved: false });
      console.log("💾 Rephrased saved for review:", rephrased);
      return { response: match, source: "rephrased" };
    }
  }

  // 3. Try GPT-3.5 intent redirect
  console.log("🧠 Checking intent...");
  const intent = await classifyIntentWithGPT35(input);
  if (intent) {
    const approvedMatch = await getApprovedMatchByIntent(intent);
    if (approvedMatch) {
      console.log("✅ Found approved match via intent:", intent);
      return { response: approvedMatch, source: `intent-${intent}` };
    }
  }

  // 4. Fallback to GPT-4
  console.log("⚠️ No match found, using GPT-4 fallback.");
  const fallback = await getAIResponseGPT4Turbo(input, context);
  if (fallback) {
    logGPTResponseToDatabase(input, fallback, context);
    return { response: fallback, source: "gpt-4" };
  }

  return { response: "I'm not sure how to respond to that.", source: "fallback" };
}
