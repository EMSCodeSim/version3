let hardcodedResponses = [];

export async function loadHardcodedResponses() {
  const snapshot = await firebase.database().ref("hardcodedResponses").once("value");
  const data = snapshot.val() || {};
  hardcodedResponses = Object.values(data);
}

export async function routeUserInput(message, { scenarioId, role }) {
  const normalized = message.trim().toLowerCase();

  const match = hardcodedResponses.find(entry =>
    entry.question?.trim().toLowerCase() === normalized ||
    entry.userQuestion?.trim().toLowerCase() === normalized
  );

  if (match && match.response) {
    return { response: match.response, source: "hardcoded" };
  }

  try {
    const res = await fetch("/api/gpt4-turbo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message })
    });

    const data = await res.json();
    if (!res.ok || !data.reply) throw new Error(data.error || "GPT failed");

    return { response: data.reply, source: "gpt" };
  } catch (err) {
    console.error("GPT fallback failed:", err.message);
    return { response: "❌ No response from AI.", source: "gpt" };
  }
}
