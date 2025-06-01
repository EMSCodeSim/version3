// router.js

let hardcodedResponses = [];

// Load responses from Firebase
export async function loadHardcodedResponses() {
  const snapshot = await firebase.database().ref("hardcodedResponses").once("value");
  const data = snapshot.val() || {};
  hardcodedResponses = Object.values(data);
}

// Tag-based match
function matchByTags(userInput) {
  const normalized = userInput.trim().toLowerCase();
  for (const entry of hardcodedResponses) {
    if (!entry.tags || !Array.isArray(entry.tags)) continue;
    if (entry.tags.some(tag => normalized.includes(tag.toLowerCase()))) {
      console.log("[router] ✅ Matched by tag:", entry.tags);
      return entry;
    }
  }
  return null;
}

// Alias match
function matchByAlias(userInput) {
  const normalized = userInput.trim().toLowerCase();
  for (const entry of hardcodedResponses) {
    if (Array.isArray(entry.aliases) && entry.aliases.some(a => a.trim().toLowerCase() === normalized)) {
      console.log("[router] ✅ Matched by alias:", entry.aliases);
      return entry;
    }
  }
  return null;
}

export async function routeUserInput(message, { scenarioId, role }) {
  const normalized = message.trim().toLowerCase();

  // 1. Exact match
  const match = hardcodedResponses.find(entry =>
    entry.question?.trim().toLowerCase() === normalized ||
    entry.userQuestion?.trim().toLowerCase() === normalized
  );
  if (match && match.response) {
    return { response: match.response, source: "hardcoded" };
  }

  // 2. Alias match
  const aliasMatch = matchByAlias(message);
  if (aliasMatch && aliasMatch.response) {
    return { response: aliasMatch.response, source: "alias" };
  }

  // 3. Tag-based match
  const tagMatch = matchByTags(message);
  if (tagMatch) {
    return { response: tagMatch.response || tagMatch.answer, source: "tag-match" };
  }

  // 4. Fallback to GPT-4
  try {
    const res = await fetch("/.netlify/functions/gpt4-turbo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message })
    });

    const data = await res.json();
    if (!res.ok || !data.reply) throw new Error(data.error || "GPT failed");

    firebase.database().ref('hardcodeReview').push({
      userQuestion: message,
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
