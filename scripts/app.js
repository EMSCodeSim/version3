// ========= Global Variables =========
let hardcodedResponses = [];
let unknownQuestions = JSON.parse(localStorage.getItem('unknownQuestions')) || [];

// ========= Load Hardcoded Responses and Merge =========
fetch('./scenarios/chest_pain_002/chat_log.json')
  .then(response => response.json())
  .then(serverData => {
    const localData = JSON.parse(localStorage.getItem('hardcodedResponses')) || [];
    hardcodedResponses = mergeHardcodedResponses(serverData, localData);
    console.log('Hardcoded responses loaded and merged.');
  })
  .catch(error => {
    console.error('Failed to load hardcoded responses:', error);
  });

// ========= Merge server + local Hardcoded Responses =========
function mergeHardcodedResponses(serverData, localData) {
  const merged = [...serverData];
  localData.forEach(localEntry => {
    const exists = merged.some(item =>
      item.userQuestion.trim().toLowerCase() === localEntry.userQuestion.trim().toLowerCase()
    );
    if (!exists) {
      merged.push(localEntry);
    }
  });
  return merged;
}

// ========= Start Scenario =========
function startScenario() {
  console.log('Scenario started.');

  fetch('./scenarios/chest_pain_002/dispatch.txt')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load dispatch information.');
      }
      return response.text();
    })
    .then(dispatchText => {
      addMessageToChat('system', dispatchText);
      showScenePhoto('./scenarios/chest_pain_002/scene1.png');
    })
    .catch(error => {
      console.error(error);
      addMessageToChat('system', 'Unable to load scenario information.');
    });
}

// ========= Show Scene Photo =========
function showScenePhoto(photoPath) {
  const chatDisplay = document.getElementById('chat-display');
  const image = document.createElement('img');
  image.src = photoPath;
  image.alt = 'Scene Photo';
  image.style.maxWidth = '100%';
  image.style.marginTop = '10px';
  chatDisplay.appendChild(image);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// ========= End Scenario =========
function endScenario() {
  console.log('Scenario ended.');
  addMessageToChat('system', 'Scenario ended. Please review your actions.');
}

// ========= Send Message =========
function sendMessage() {
  const userInput = document.getElementById('user-input');
  const userMessage = userInput.value.trim();
  if (userMessage === '') return;

  addMessageToChat('user', userMessage);
  checkForTrigger(userMessage);  // <<< CHECK TRIGGERS FIRST
  processUserInput(userMessage);
  userInput.value = '';
}

// ========= Open Admin Panel =========
function openAdmin() {
  window.open('admin.html', '_blank');
}

// ========= Add Message to Chat =========
function addMessageToChat(sender, message) {
  const chatDisplay = document.getElementById('chat-display');
  const messageDiv = document.createElement('div');
  messageDiv.style.marginBottom = "10px";

  if (sender === 'user') {
    messageDiv.style.textAlign = "right";
    messageDiv.innerHTML = `<strong>You:</strong> ${message}`;
  } else if (sender === 'system') {
    messageDiv.style.textAlign = "center";
    messageDiv.innerHTML = `<em>${message}</em>`;
  } else if (sender === 'patient') {
    messageDiv.style.textAlign = "left";
    messageDiv.style.color = "blue";
    messageDiv.innerHTML = `<strong>Patient:</strong> ${message}`;
  } else if (sender === 'proctor') {
    messageDiv.style.textAlign = "left";
    messageDiv.style.color = "gray";
    messageDiv.innerHTML = `<strong>Proctor:</strong> ${message}`;
  } else {
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
  }

  chatDisplay.appendChild(messageDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// ========= Process User Input =========
function processUserInput(message) {
  console.log(`User input: ${message}`);

  const normalizedMessage = message.trim().toLowerCase();
  const matchedResponse = hardcodedResponses.find(entry => entry.userQuestion.trim().toLowerCase() === normalizedMessage);

  if (matchedResponse) {
    console.log('Matched hardcoded response.');
    addMessageToChat(matchedResponse.role, matchedResponse.aiResponse);
  } else {
    console.log('No hardcoded match found. Logging and sending to ChatGPT backend.');

    unknownQuestions.push({
      userQuestion: message,
      aiResponse: "",
      role: "pending"
    });
    localStorage.setItem('unknownQuestions', JSON.stringify(unknownQuestions));

    const currentIndex = unknownQuestions.length - 1;

    fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: message })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to get response from Chat function.');
      }
      return response.json();
    })
    .then(data => {
      if (data) {
        let aiReply = "";
        let role = "";

        if (data.patientReply) {
          aiReply = data.patientReply;
          role = "patient";
          addMessageToChat('patient', aiReply);
        } else if (data.proctorReply) {
          aiReply = data.proctorReply;
          role = "proctor";
          addMessageToChat('proctor', aiReply);
        } else {
          addMessageToChat('system', 'No valid AI response.');
        }

        if (aiReply) {
          unknownQuestions[currentIndex].aiResponse = aiReply;
          unknownQuestions[currentIndex].role = role;
          localStorage.setItem('unknownQuestions', JSON.stringify(unknownQuestions));
        }
      }
    })
    .catch(error => {
      console.error(error);
      addMessageToChat('system', 'Error contacting AI service.');
    });
  }
}

// ========= Triggers =========
let triggers = JSON.parse(localStorage.getItem('triggers')) || [];

function checkForTrigger(userMessage) {
  for (let trigger of triggers) {
    if (userMessage.toLowerCase().includes(trigger.pattern.toLowerCase())) {
      console.log(`Trigger matched: ${trigger.pattern}`);
      handleTriggerAction(trigger);
      break;
    }
  }
}

function handleTriggerAction(trigger) {
  if (trigger.type === 'photo') {
    showPhotoTrigger(trigger);
  } else if (trigger.type === 'audio') {
    playAudioTrigger(trigger);
  } else if (trigger.type === 'app') {
    launchAppTrigger(trigger);
  } else {
    console.log('Unknown trigger type:', trigger.type);
  }
}

// ========= Show Triggered Photo =========
function showPhotoTrigger(trigger) {
  const chatDisplay = document.getElementById('chat-display');
  const image = document.createElement('img');
  image.src = trigger.fileData;
  image.alt = 'Triggered Photo';
  image.style.maxWidth = '100%';
  image.style.marginTop = '10px';
  chatDisplay.appendChild(image);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// ========= Play Triggered Audio =========
function playAudioTrigger(trigger) {
  const audio = new Audio(trigger.fileData);
  audio.play();
}

// ========= Launch Simulated App =========
function launchAppTrigger(trigger) {
  alert('Simulated App Launched! (Future expansion: could open a mini-app window.)');
}

// ========= Expose Functions Globally =========
window.startScenario = startScenario;
window.endScenario = endScenario;
window.sendMessage = sendMessage;
window.openAdmin = openAdmin;
