// ========= Normalize Input =========
function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

// ========= Cosine Similarity for Vector Search =========
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

// ========= Vector Search Fallback =========
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

  // Fallback to GPT-4 Turbo
  addMessageToChat("system", "No match found. Forwarding to AI...");
  sendToGPT(message);
}

// ========= Play Pre-Generated TTS Audio =========
function playTTS(audioFile) {
  const audio = new Audio(audioFile);
  audio.play();
}

// ========= Add Messages to Chat Display =========
function addMessageToChat(role, text) {
  const chatDisplay = document.getElementById("chat-display");
  const messageDiv = document.createElement("div");
  messageDiv.style.marginBottom = "10px";

  if (role === 'patient') {
    messageDiv.style.color = "blue";
    messageDiv.innerHTML = `<strong>Patient:</strong> ${text}`;
  } else if (role === 'proctor') {
    messageDiv.style.color = "gray";
    messageDiv.innerHTML = `<strong>Proctor:</strong> ${text}`;
  } else if (role === 'user') {
    messageDiv.style.textAlign = "right";
    messageDiv.innerHTML = `<strong>You:</strong> ${text}`;
  } else if (role === 'system') {
    messageDiv.style.textAlign = "center";
    messageDiv.innerHTML = `<em>${text}</em>`;
  } else {
    messageDiv.innerHTML = `<strong>${role}:</strong> ${text}`;
  }

  chatDisplay.appendChild(messageDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// ========= Send to GPT-4 Turbo API =========
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

// ========= Scenario Control Functions =========
function startScenario() {
  fetch('./scenarios/chest_pain_002/dispatch.txt')
    .then(response => response.text())
    .then(dispatchText => {
      addMessageToChat('system', dispatchText);
      showScenePhoto('./scenarios/chest_pain_002/scene1.png');
    })
    .catch(error => console.error('Dispatch load failed', error));
}

function endScenario() {
  addMessageToChat('system', 'Scenario ended.');
}

function sendMessage() {
  const userInput = document.getElementById('user-input');
  const message = userInput.value.trim();
  if (!message) return;
  addMessageToChat('user', message);
  processUserInput(message);
  userInput.value = '';
}

function openAdmin() {
  window.open('admin_home.html', '_blank');
}

function openApproveResponses() {
  window.open('admin.html', '_blank');
}

function showScenePhoto(photoPath) {
  const chatDisplay = document.getElementById('chat-display');
  const image = document.createElement('img');
  image.src = photoPath;
  image.alt = 'Scene Photo';
  image.style.maxWidth = '100%';
  chatDisplay.appendChild(image);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// ========= Expose Button Functions Globally =========
window.startScenario = startScenario;
window.endScenario = endScenario;
window.sendMessage = sendMessage;
window.openAdmin = openAdmin;
window.openApproveResponses = openApproveResponses;
