// ========= Start Scenario =========
function startScenario() {
  console.log('Scenario started.');

  // First, load dispatch info
  fetch('./scenarios/chest_pain_002/dispatch.txt')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load dispatch information.');
      }
      return response.text();
    })
    .then(dispatchText => {
      addMessageToChat('system', dispatchText);

      // AFTER dispatch loaded, show scene photo
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
  checkForTrigger(userMessage);
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
  } else if (sender === 'bot') {
    messageDiv.style.textAlign = "left";
    messageDiv.innerHTML = `<strong>Bot:</strong> ${message}`;
  } else {
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
  }

  chatDisplay.appendChild(messageDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// ========= Process User Input (talk to Netlify backend) =========
function processUserInput(message) {
  console.log(`Sending message to ChatGPT backend: ${message}`);

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
    if (data && data.botReply) {
      addMessageToChat('bot', data.botReply);
    } else {
      addMessageToChat('system', 'No valid response from AI.');
    }
  })
  .catch(error => {
    console.error(error);
    addMessageToChat('system', 'Error contacting AI service.');
  });
}

// ========= Triggers =========
let triggers = JSON.parse(localStorage.getItem('triggers')) || [];

function checkForTrigger(userMessage) {
  for (let trigger of triggers) {
    if (userMessage.toLowerCase().includes(trigger.pattern.toLowerCase())) {
      console.log(`Trigger found: ${trigger.pattern}`);
      for (let action of trigger.actions) {
        handleTriggerAction(action);
      }
      break;
    }
  }
}

function handleTriggerAction(action) {
  if (action === 'play_breath_sounds') {
    console.log('Playing breath sounds...');
    alert('Breath sounds would play!');
  } else if (action === 'show_scene_photo') {
    console.log('Showing scene photo...');
    alert('Scene photo would display!');
  } else if (action === 'play_bp_cuff_sound') {
    console.log('Playing BP cuff sound...');
    alert('BP cuff sound would play!');
  } else if (action === 'show_patient_photo') {
    console.log('Showing patient photo...');
    alert('Patient photo would display!');
  }
}

// ========= Expose Functions Globally for Buttons =========
window.startScenario = startScenario;
window.endScenario = endScenario;
window.sendMessage = sendMessage;
window.openAdmin = openAdmin;
