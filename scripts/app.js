// ========= Firebase References =========
const unknownsRef = firebase.database().ref('unknownQuestions');
const hardcodesRef = firebase.database().ref('hardcodedResponses');
const triggersRef = firebase.database().ref('triggers');

// ========= Global Variables =========
let hardcodedResponses = [];
let unknownQuestions = [];
let triggers = [];

// ========= Load Data from Firebase =========
function loadFirebaseData() {
  unknownsRef.on('value', snapshot => {
    unknownQuestions = snapshot.val() || [];
    console.log('Unknown Questions Loaded');
  });

  hardcodesRef.on('value', snapshot => {
    hardcodedResponses = snapshot.val() || [];
    console.log('Hardcoded Responses Loaded');
  });

  triggersRef.on('value', snapshot => {
    triggers = snapshot.val() || [];
    console.log('Triggers Loaded');
  });
}
loadFirebaseData();

// ========= Start Scenario =========
function startScenario() {
  fetch('./scenarios/chest_pain_002/dispatch.txt')
    .then(response => response.text())
    .then(dispatchText => {
      addMessageToChat('system', dispatchText);
      showScenePhoto('./scenarios/chest_pain_002/scene1.png');
    })
    .catch(error => console.error('Dispatch load failed', error));
}

// ========= Show Scene Photo =========
function showScenePhoto(photoPath) {
  const chatDisplay = document.getElementById('chat-display');
  const image = document.createElement('img');
  image.src = photoPath;
  image.alt = 'Scene Photo';
  image.style.maxWidth = '100%';
  chatDisplay.appendChild(image);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// ========= End Scenario =========
function endScenario() {
  addMessageToChat('system', 'Scenario ended.');
}

// ========= Send Message =========
function sendMessage() {
  const userInput = document.getElementById('user-input');
  const message = userInput.value.trim();
  if (!message) return;

  addMessageToChat('user', message);
  checkForTrigger(message);
  processUserInput(message);
  userInput.value = '';
}

// ========= Open Admin =========
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

// ========= Process User Input (MAIN FIX HERE) =========
function processUserInput(message) {
  const normalizedMessage = message.trim().toLowerCase();
  const match = hardcodedResponses.find(entry => entry.userQuestion.trim().toLowerCase() === normalizedMessage);

  if (match) {
    addMessageToChat(match.role, match.aiResponse);
  } else {
    console.log('No hardcoded match. Sending to AI...');

    const newUnknown = {
      userQuestion: message,
      aiResponse: "",
      role: "pending"
    };

    unknownQuestions.push(newUnknown);
    unknownsRef.set(unknownQuestions);

    fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    })
    .then(response => response.json())
    .then(data => {
      if (data) {
        let aiReply = '';
        let role = '';

        if (data.patientReply) {
          aiReply = data.patientReply;
          role = 'patient';
          addMessageToChat('patient', aiReply);
        } else if (data.proctorReply) {
          aiReply = data.proctorReply;
          role = 'proctor';
          addMessageToChat('proctor', aiReply);
        } else {
          addMessageToChat('system', 'No valid AI response.');
        }

        if (aiReply) {
          newUnknown.aiResponse = aiReply;
          newUnknown.role = role;
          unknownQuestions[unknownQuestions.length - 1] = newUnknown;
          unknownsRef.set(unknownQuestions);
        }
      }
    })
    .catch(error => {
      console.error('Error contacting AI service.', error);
      addMessageToChat('system', 'Error contacting AI service.');
    });
  }
}

// ========= Check and Handle Triggers =========
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
  }
}

function showPhotoTrigger(trigger) {
  const chatDisplay = document.getElementById('chat-display');
  const image = document.createElement('img');
  image.src = trigger.fileData;
  image.alt = 'Triggered Photo';
  image.style.maxWidth = '100%';
  chatDisplay.appendChild(image);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

function playAudioTrigger(trigger) {
  const audio = new Audio(trigger.fileData);
  audio.play();
}

function launchAppTrigger(trigger) {
  alert('Simulated App Launch');
}

// ========= Expose Functions Globally =========
window.startScenario = startScenario;
window.endScenario = endScenario;
window.sendMessage = sendMessage;
window.openAdmin = openAdmin;
