document.addEventListener("DOMContentLoaded", async () => {
  const urls = [
    "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part1.json",
    "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part2.json",
    "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part3.json"
  ];

  let combinedEntries = [];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      const data = await res.json();

      // Handle object keyed by Firebase-like IDs
      const entries = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));

      combinedEntries.push(...entries);
    } catch (err) {
      console.error(`Failed to load from ${url}:`, err);
    }
  }

  // Optional: Remove duplicates based on `question` + `answer`
  const unique = [];
  const seen = new Set();

  for (const entry of combinedEntries) {
    const key = (entry.question || "") + "::" + (entry.answer || "");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(entry);
    }
  }

  displayEntries(unique);
  document.getElementById("statusBox").innerText = `✅ Loaded ${unique.length} entries.`;
});

function displayEntries(entries) {
  const container = document.getElementById("entryContainer");
  entries.forEach((entry, index) => {
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `
      <p><strong>Question:</strong> ${entry.question || ""}</p>
      <p><strong>Answer:</strong> ${entry.answer || ""}</p>
      <p><strong>Tags:</strong> ${(entry.tags || []).join(", ")}</p>
      <p><strong>Role:</strong> ${entry.role || ""}</p>
      <p><strong>Score Category:</strong> ${entry.scoreCategory || ""}</p>
      <button onclick="playVoice('${entry.ttsAudio || ""}')">🔊 Voice</button>
    `;
    container.appendChild(div);
  });
}

function playVoice(audioBase64) {
  if (!audioBase64) return;
  const audio = new Audio("data:audio/mp3;base64," + audioBase64);
  audio.play();
}
