let hardcodedResponses = [];

export async function loadHardcodedResponses() {
  const snapshot = await firebase.database().ref("hardcodedResponses").once("value");
  const data = snapshot.val() || {};
  hardcodedResponses = Object.values(data);
}

async function rephraseWithGPT3(message) {
  console.log("[router] Calling GPT-3.5 rephrase for:", message);
  try {
    const res = await fetch("/.netlify/functions/gpt3_rephrase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    if (res.ok && data.rephrased) {
      console.log("[router] GPT-3.5 rephrased result:", data.rephrased);
      return data.rephrased.trim();
    }
    throw new Error(data.error || "No rephrased output");
  } catch (err) {
    console.warn("GPT-3.5 rephrase failed:", err.message);
    return message; // Fallback: use original if rephrase fails
  }
}

export async function routeUserInput(message, { scenarioId, role }) {
  const normalized = message.trim().toLowerCase();

  // 1. Exact match first
  const match = hardcodedResponses.find(entry =>
    entry.question?.trim().toLowerCase() === normalized ||
    entry.userQuestion?.trim().toLowerCase() === normalized
  );
  if (match && match.response) {
    return { response: match.response, source: "hardcoded" };
  }

  // 2. Rephrase with GPT-3.5
  const rephrased = await rephraseWithGPT3(message);
  if (rephrased && rephrased !== message) {
    const rephrasedNorm = rephrased.trim().toLowerCase();
    const match2 = hardcodedResponses.find(entry =>
      entry.question?.trim().toLowerCase() === rephrasedNorm ||
      entry.userQuestion?.trim().toLowerCase() === rephrasedNorm
    );
    if (match2 && match2.response) {
      return { response: match2.response, source: "hardcoded" };
    }
  }

  // 3. Fallback to GPT-4 Turbo
  try {
    const res = await fetch("/.netlify/functions/gpt4-turbo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message })
    });

    const data = await res.json();
    if (!res.ok || !data.reply) throw new Error(data.error || "GPT failed");

    // --- Log to hardcodeReview for future approval ---
    firebase.database().ref('hardcodeReview').push({
      userQuestion: message,
      rephrasedQuestion: rephrased,
      aiResponse: data.reply,
      role: role || "patient",
      timestamp: Date.now()
    });

    return { response: data.reply, source: "gpt" };
  } catch (err) {
    console.error("GPT fallback failed:", err.message);
    return { response: "❌ No response from AI.", source: "gpt" };
  }
}
