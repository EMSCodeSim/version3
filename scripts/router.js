// router.js

let hardcodedResponses = {};

export async function loadHardcodedResponses() {
  try {
    const snapshot = await firebase.database().ref('hardcodedResponses').once('value');
    hardcodedResponses = snapshot.val() || {};
    console.log("✅ Hardcoded responses loaded");
  } catch (error) {
    console.error("❌ Failed to load hardcoded responses:", error);
  }
}

export async function routeUserInput(userInput, context = {}) {
  const input = userInput.trim().toLowerCase();

  // 🔍 1. Exact hardcode match
  if (hardcodedResponses[input]) {
    return { response: hardcodedResponses[input], source: "hardcoded-exact" };
  }

  // 🔄 2. GPT-3.5 rephrase + retry hardcoded match
  const rephrased = await rephraseWithGPT35(input);
  if (rephrased && hardcodedResponses[rephrased.toLowerCase()]) {
    return { response: hardcodedResponses[rephrased.toLowerCase()], source: "hardcoded-rephrased" };
  }

  // 💬 3. GPT-4 Turbo fallback
  const aiResponse = await getAIResponseGPT4Turbo(input, context);
  if (aiResponse) {
    logGPTResponseToDatabase(input, aiResponse, context);
    return { response: aiResponse, source: "gpt-4-fallback" };
  }

  return { response: "I'm not sure how to respond to that.", source: "fallback" };
}

// 🔁 GPT-3.5 rephrasing
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

// 🤖 GPT-4 Turbo fallback
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

// 🧠 Log unmatched input and GPT reply for review
function logGPTResponseToDatabase(input, reply, context) {
  const logRef = firebase.database().ref("unmatchedLog").push();
  const entry = {
    timestamp: Date.now(),
    userInput: input,
    gptReply: reply,
    context
  };
  setTimeout(() => logRef.set(entry), 1000); // slight delay in case DB isn't ready
}
