// ========== User Send Message ==========
function sendMessage() {
  const userMessage = document.getElementById('user-input').value;
  if (userMessage.trim() === '') return;
  
  addMessageToChat('user', userMessage);
  checkForTrigger(userMessage);
  
  processUserInput(userMessage); // Your existing AI/chat logic
  document.getElementById('user-input').value = '';
}

// ========== Trigger Check & Action Handling ==========
let triggers = JSON.parse(localStorage.getItem('triggers')) || [];

function checkForTrigger(userMessage) {
  for (let trigger of triggers) {
    if (userMessage.toLowerCase().includes(trigger.pattern.toLowerCase())) {
      console.log(`Trigger found for: "${trigger.pattern}"`);
      for (let action of trigger.actions) {
        handleTriggerAction(action);
      }
      break; // Only fire the first matching trigger
    }
  }
}

function handleTriggerAction(action) {
  if (action === 'play_breath_sounds') {
    console.log('Playing breath sounds...');
    alert('Breath sounds would play here!');
    // Example: document.getElementById('breath-sounds-audio').play();
  } else if (action === 'show_scene_photo') {
    console.log('Showing scene photo...');
    alert('Scene photo would display!');
    // Example: document.getElementById('scene-photo').style.display = 'block';
  } else if (action === 'play_bp_cuff_sound') {
    console.log('Playing BP cuff sound...');
    alert('BP cuff sound would play!');
  } else if (action === 'show_patient_photo') {
    console.log('Showing patient photo...');
    alert('Patient photo would display!');
  }
  // Expand with more actions later!
}
