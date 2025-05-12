// router.js

let hardcodedResponses = {};

export async function loadHardcodedResponses() {
  try {
    const snapshot = await firebase.database().ref('hardcodedResponses').once('value');
    const data = snapshot.val() || {};

    hardcodedResponses = data;
    console.log(`✅ Loaded ${Object.keys(data).length} hardcoded responses.`);
  } catch (err) {
    console.error("❌ Failed to load hardcoded responses:", err.message);
  }
}

export async function routeUserInput(input, context = {}) {
  input = input.trim().toLowerCase();
  console.log("USER INPUT:", input);
  console.log("ROLE:", context.role || "unknown");

  // 1. Try exact hardcoded match
  const matches = Object.values(hardcodedResponses).filter(entry => {
    const key = (entry.question || entry.userQuestion || "").trim().toLowerCase();
    return key === input && (!entry.role || entry.role.toLowerCase() === context.role.toLowerCase());
  });

  if (matches.length > 0) {
    console.log("✅ Matched hardcoded response:", matches[0]);
    return {
      response: matches[0].response || "[No response text]",
      source: "hardcoded",
    };
  }

  // 2. Fallback to GPT route
  console.warn("⚠️ No hardcoded match found for:", input);
  const gptRes = await fetch("/api/gpt4-turbo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_input: input,
      scenario_id: context.scenarioId || "default",
      role: context.role || "patient",
    }),
  });

  const gptData = await gptRes.json();
  return {
    response: gptData?.response || "❌ No response from AI.",
    source: "gpt",
  };
}
