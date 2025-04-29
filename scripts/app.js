// ========= Normalize Function =========
function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

// ========= Cosine Similarity =========
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

// ========= Exact Match Search =========
function findHardcodedMatch(userInput) {
  const cleanedInput = normalize(userInput);

  for (const entry of hardcodedResponses) {
    const variations = Array.isArray(entry.userQuestions) ? entry.userQuestions : [entry.userQuestion];
    for (const phrase of variations) {
      if (normalize(phrase) === cleanedInput) {
        return entry;
      }
    }
  }
  return null;
}

// ========= Vector Search (fallback) =========
async function vectorSearch(userInput) {
  try {
    const response = await fetch("/.netlify/functions/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: userInput })
    });

    const { embedding: inputVector } = await response.json();

    let bestMatch = null;
    let bestScore = 0;

    for (const entry of hardcodedResponses) {
      if (!entry.embedding) continue;
      const score = cosineSimilarity(inputVector, entry.embedding);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    return bestScore > 0.85 ? bestMatch : null;

  } catch (err) {
    console.error("Vector search failed:", err);
    return null;
  }
}

// ========= Process User Input =========
async function processUserInput(message) {
  const userInput = message.trim();

  const exactMatch = findHardcodedMatch(userInput);
  if (exactMatch) {
    addMessageToChat(exactMatch.role, exactMatch.aiResponse);
    if (exactMatch.audioFile) playTTS(exactMatch.audioFile);
    return;
  }

  const vectorMatch = await vectorSearch(userInput);
  if (vectorMatch) {
    addMessageToChat(vectorMatch.role, vectorMatch.aiResponse);
    if (vectorMatch.audioFile) playTTS(vectorMatch.audioFile);
    return;
  }

  // Fallback to GPT
  addMessageToChat("system", "No match found. Forwarding to AI...");
  sendToGPT(message);
}

// ========= TTS Playback =========
function playTTS(audioFile) {
  const audio = new Audio(audioFile);
  audio.play();
}

// ========= Chat Display =========
function addMessageToChat(role, text) {
  const chat = document.getElementById("chat-display");
  const msg = document.createElement("div");
  msg.textContent = `${role.toUpperCase()}: ${text}`;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

// ========= GPT Fallback =========
function sendToGPT(message) {
  fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  })
  .then(res => res.json())
  .then(data => {
    addMessageToChat("patient", data.reply);
  })
  .catch(err => {
    console.error("GPT error", err);
    addMessageToChat("system", "Error getting AI response.");
  });
}
