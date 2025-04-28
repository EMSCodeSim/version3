// ========= App Logic =========

// Start Scenario
function startScenario() {
  console.log('Scenario started.');
  addMessageToChat('system', 'Dispatch information appears here.');
}

// End Scenario
function endScenario() {
  console.log('Scenario ended.');
  addMessageToChat('system', 'Scenario ended. Please review your actions.');
}

// Send Message
function sendMessage() {
  const userInput = document.getElementById('user-input');
  const userMessage = userInput.value.trim();
  if (userMessage === '') return;

  addMessageToChat('user', userMessage);
  checkForTrigger(userMessage);
  processUserInput(userMessage);
  userInput.value = '';
}

// Open Admin
function openAdmin() {
  window.open('admin.html', '_blank');
}

// Add Message to Chat
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
  } else {
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
  }

  chatDisplay.appendChild(messageDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// Placeholder for AI input
function processUserInput(message) {
  console.log(`Processing input: ${message}`);
}

// Triggers
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

// Expose to global window so buttons can find them
window.startScenario = startScenario;
window.endScenario = endScenario;
window.sendMessage = sendMessage;
window.openAdmin = openAdmin;
