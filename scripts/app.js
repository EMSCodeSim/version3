// ========== Send Message ==========
function sendMessage() {
  const userInput = document.getElementById('user-input');
  const userMessage = userInput.value.trim();
  if (userMessage === '') return;

  addMessageToChat('user', userMessage);
  checkForTrigger(userMessage);
  processUserInput(userMessage);
  userInput.value = '';
}

// ========== Start Scenario ==========
function startScenario() {
  console.log('Scenario started.');
  addMessageToChat('system', 'Dispatch information appears here.'); 
  // You can expand this to load specific dispatch info later
}

// ========== End Scenario ==========
function endScenario() {
  console.log('Scenario ended.');
  addMessageToChat('system', 'Scenario ended. Please review your actions.');
  // You can expand to include scoring and feedback
}

// ========== Display Chat Message ==========
function addMessageToChat(sender, message) {
  const chatDisplay = document.getElementById('chat-display');
  const messageDiv = document.createElement('div');
  messageDiv.className = sender;
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
  chatDisplay.scrollTop = chatDisplay.scrollHeight; // Auto scroll
}

// ========== Process User Input (Placeholder) ==========
function processUserInput(message) {
  console.log(`Processing user input: ${message}`);
  // This is where your AI or GPT call would go
}

// ========== Trigger Checking ==========
let triggers = JSON.parse(localStorage.getItem('triggers')) || [];

function checkForTrigger(userMessage) {
  for (let trigger of triggers) {
    if (userMessage.toLowerCase().includes(trigger.pattern.toLowerCase())) {
      console.log(`Trigger found for: "${trigger.pattern}"`);
      for (let action of trigger.actions) {
        handleTriggerAction(action);
      }
      break; // First matching trigger fires only
    }
  }
}

function handleTriggerAction(action) {
  if (action === 'play_breath_sounds') {
    console.log('Playing breath sounds...');
    alert('Breath sounds would play here!');
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
  // Add more actions here
}
