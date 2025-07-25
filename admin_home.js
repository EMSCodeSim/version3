document.addEventListener("DOMContentLoaded", async () => {
  const urls = [
    "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part1.json",
    "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part2.json",
    "https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part3.json"
  ];

  const statusBox = document.getElementById("statusBox");
  const container = document.getElementById("entryContainer");
  let combinedEntries = [];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const entries = Object.entries(data).map(([key, value]) => ({
        id: key,
        ...value
      }));

      combinedEntries.push(...entries);
    } catch (err) {
      console.error("Failed to fetch or parse:", url, err);
      statusBox.innerText = `❌ Failed to load from ${url}`;
      return;
    }
  }

  if (combinedEntries.length === 0) {
    statusBox.innerText = "⚠️ No entries found.";
    return;
  }

  combinedEntries.forEach(entry => {
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `
      <p><strong>Question:</strong> ${entry.question || ""}</p>
      <p><strong>Answer:</strong> ${entry.answer || ""}</p>
      <p><strong>Role:</strong> ${entry.role || ""}</p>
      <p><strong>Tags:</strong> ${(entry.tags || []).join(", ")}</p>
      <p><strong>Score Category:</strong> ${entry.scoreCategory || ""}</p>
      ${entry.ttsAudio ? `<button onclick="playAudio('${entry.ttsAudio}')">🔊 Play</button>` : ""}
      <hr>
    `;
    container.appendChild(div);
  });

  statusBox.innerText = `✅ Loaded ${combinedEntries.length} total entries.`;
});

function playAudio(base64) {
  const audio = new Audio("data:audio/mp3;base64," + base64);
  audio.play();
}
