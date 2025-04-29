// === SCENARIO CONFIG ===
const scenarioPath = 'scenarios/chest_pain_002/';
let patientContext = ""; // Global context for GPT

async function loadDispatchInfo() {
  try {
    const res = await fetch(`${scenarioPath}dispatch.txt`);
    return await res.text();
  } catch (e) {
    console.error("Error loading dispatch.txt", e);
    return "Dispatch information unavailable.";
  }
}

async function loadPatientInfo() {
  try {
    const res = await fetch(`${scenarioPath}patient.txt`);
    return await res.text();
  } catch (e) {
    console.error("Error loading patient.txt", e);
    return "Patient introduction unavailable.";
  }
}

// === MAIN CHAT FLOW ===
async function processUserMessage(message) {
  console.log("Checking hardcoded responses...");
  let hardcodeResponse = checkHardcodedResponse(message);

  if (hardcodeResponse) {
    console.log("Hardcode match found!");
    displayChatResponse(hardcodeResponse);
    return;
  }

  console.log("No hardcode match, checking vector similarity...");
  let vectorResponse = await getVectorResponse(message);

  if (vectorResponse) {
    console.log("Vector match found!");
    displayChatResponse(vectorResponse);
    return;
  }

  console.log("No vector match, falling back to GPT-4 Turbo AI...");
  let aiResponse = await getAIResponseGPT4Turbo(message);

  if (aiResponse) {
    console.log("Received AI response.");
    logAIResponseToDatabase(message, aiResponse);
    displayChatResponse(aiResponse);
  } else {
    console.error("No response received from AI.");
    displayChatResponse("Sorry, I encountered an error processing your request.");
  }
}

// === LOOKUP FUNCTIONS ===
function checkHardcodedResponse(message) {
  return hardcodedResponses?.[message.toLowerCase()] || null;
}

async function getVectorResponse(message) {
  try {
    const response = await fetch('/api/vector-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message })
    });
    const data = await response.json();
    return data.match || null;
  } catch (error) {
    console.error("Vector search error:", error);
    return null;
  }
}

async function getAIResponseGPT4Turbo(message) {
  try {
    const fullPrompt = `Patient Info:\n${patientContext}\n\nUser asked: ${message}`;

    const response = await fetch('/api/gpt4-turbo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt })
    });

    const data = await response.json();
    return data.reply || null;
  } catch (error) {
    console.error("AI request error:", error);
    return null;
  }
}

function logAIResponseToDatabase(userMessage, aiResponse) {
  firebase.database().ref('ai_responses_log').push({
    userMessage,
    aiResponse,
    timestamp: Date.now()
  });
}

// === UI FUNCTIONS ===
function displayChatResponse(response) {
  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML += `<div class="response">${response}</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

// === SCENARIO START ===
startScenario = async function () {
  const dispatch = await loadDispatchInfo();
  patientContext = await loadPatientInfo(); // Store for AI prompt

  displayChatResponse(`🚑 Dispatch: ${dispatch}`);
  setTimeout(() => {
    displayChatResponse(`👤 Patient: ${patientContext}`);
  }, 1000);
};

endScenario = function () {
  displayChatResponse("📦 Scenario ended. Please complete your handoff report.");
};

startVoiceRecognition = function () {
  displayChatResponse("🎤 Voice recognition activated. (Simulated)");
};

// === BUTTON LOGIC ===
document.addEventListener('DOMContentLoaded', function () {
  const sendButton = document.getElementById('send-button');
  const userInput = document.getElementById('user-input');
  const startButton = document.getElementById('start-button');
  const endButton = document.getElementById('end-button');
  const micButton = document.getElementById('mic-button');

  if (sendButton) {
    sendButton.addEventListener('click', function () {
      const message = userInput.value.trim();
      if (message) {
        processUserMessage(message);
        userInput.value = '';
      }
    });
  }

  if (userInput) {
    userInput.addEventListener('keypress', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendButton.click();
      }
    });
  }

  if (startButton) {
    startButton.addEventListener('click', function () {
      startScenario?.();
    });
  }

  if (endButton) {
    endButton.addEventListener('click', function () {
      endScenario?.();
    });
  }

  if (micButton) {
    micButton.addEventListener('click', function () {
      startVoiceRecognition?.();
    });
  }
});
