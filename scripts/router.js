let hardcodedResponses = [];

// Load responses from Firebase
export async function loadHardcodedResponses() {
  const snapshot = await firebase.database().ref("hardcodedResponses").once("value");
  const data = snapshot.val() || {};
  hardcodedResponses = Object.values(data);
}

function normalize(str) {
  return (str || "").trim().toLowerCase();
}

// Alias match
function matchByAlias(userInput) {
  const norm = normalize(userInput);
  for (const entry of hardcodedResponses) {
    if (Array.isArray(entry.aliases) && entry.aliases.some(a => normalize(a) === norm)) {
      return entry;
    }
  }
  return null;
}

// Tag match (never runs if exact/alias found)
function matchByTags(userInput) {
  const norm = normalize(userInput);
  for (const entry of hardcodedResponses) {
    if (!entry.tags || !Array.isArray(entry.tags)) continue;
    if (entry.tags.some(tag => norm.includes(tag.toLowerCase()))) {
      return entry;
    }
  }
  return null;
}

export async function routeUserInput(message, { scenarioId, role }) {
  const norm = normalize(message);

  // 1. Exact match
  const match = hardcodedResponses.find(entry =>
    normalize(entry.question) === norm ||
    normalize(entry.userQuestion) === norm
  );
  if (match && match.response) {
    return { response: match.response, source: "hardcoded" };
  }

  // 2. Alias match
  const aliasMatch = matchByAlias(message);
  if (aliasMatch && aliasMatch.response) {
    return { response: aliasMatch.response, source: "alias" };
  }

  // 3. Tag match
  const tagMatch = matchByTags(message);
  if (tagMatch && tagMatch.response) {
    return { response: tagMatch.response, source: "tag-match" };
  }

  // 4. GPT fallback
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
