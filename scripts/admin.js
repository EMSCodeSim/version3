// ========= Firebase References =========
const unknownsRef = firebase.database().ref('unknownQuestions');
const hardcodesRef = firebase.database().ref('hardcodedResponses');
const triggersRef = firebase.database().ref('triggers');

// ========= Global Variables =========
let unknownQuestions = [];
let hardcodedResponses = [];
let triggers = [];

// ========= Load Data =========
function loadFirebaseData() {
  unknownsRef.on('value', snapshot => {
    unknownQuestions = snapshot.val() || [];
    displayPendingUnknowns();
  });

  hardcodesRef.on('value', snapshot => {
    hardcodedResponses = snapshot.val() || [];
    displayApprovedHardcoded();
  });

  triggersRef.on('value', snapshot => {
    triggers = snapshot.val() || [];
  });
}
loadFirebaseData();

// ========= Display Pending Unknowns =========
function displayPendingUnknowns() {
  const pendingList = document.getElementById('pending-list');
  pendingList.innerHTML = '';

  unknownQuestions.forEach((entry, index) => {
    const div = document.createElement('div');
    div.style.border = "1px solid #ccc";
    div.style.padding = "10px";
    div.style.marginBottom = "10px";
    div.innerHTML = `
      <label>Question:</label>
      <input type="text" id="pending-question-${index}" value="${entry.userQuestion}" style="width:100%;"><br>
      
      <label>AI Response:</label>
      <textarea id="pending-response-${index}" style="width:100%; height:60px;">${entry.aiResponse || ''}</textarea><br>
      
      <label>Role:</label>
      <select id="pending-role-${index}">
        <option value="patient" ${entry.role === 'patient' ? 'selected' : ''}>Patient</option>
        <option value="proctor" ${entry.role === 'proctor' ? 'selected' : ''}>Proctor</option>
      </select><br>
      
      <label>Voice:</label>
      <select id="pending-voice-${index}">
        <option value="fable">Fable (warm male)</option>
        <option value="alloy">Alloy (neutral male)</option>
        <option value="onyx">Onyx (deep male)</option>
        <option value="shimmer">Shimmer (calm female)</option>
        <option value="nova">Nova (energetic female)</option>
        <option value="echo">Echo (energetic male)</option>
      </select><br>
      
      <label>Trigger (optional):</label>
      <select id="pending-trigger-type-${index}">
        <option value="">None</option>
        <option value="photo">Photo</option>
        <option value="audio">Audio</option>
        <option value="app">App</option>
      </select><br>

      <input type="file" id="trigger-file-pending-${index}" style="margin-top:5px;"><br><br>

      <button onclick="approveUnknown(${index})">Approve</button>
      <button onclick="deleteUnknown(${index})">Delete</button>
    `;
    pendingList.appendChild(div);
  });
}

// ========= Display Approved Hardcoded Responses =========
function displayApprovedHardcoded() {
  const approvedList = document.getElementById('approved-list');
  approvedList.innerHTML = '';

  hardcodedResponses.forEach((entry, index) => {
    const div = document.createElement('div');
    div.style.border = "1px solid #ccc";
    div.style.padding = "10px";
    div.style.marginBottom = "10px";
    div.innerHTML = `
      <strong>Q:</strong> ${entry.userQuestion}<br>
      <strong>A:</strong> ${entry.aiResponse}<br>
      <strong>Role:</strong> ${entry.role}<br>
      <strong>Voice:</strong> ${entry.voice || 'default'}<br>
      <strong>Audio File:</strong> ${entry.audioFile || 'none'}<br>
    `;
    approvedList.appendChild(div);
  });
}

// ========= Approve Unknown =========
async function approveUnknown(index) {
  const questionInput = document.getElementById(`pending-question-${index}`).value.trim();
  const responseInput = document.getElementById(`pending-response-${index}`).value.trim();
  const roleInput = document.getElementById(`pending-role-${index}`).value;
  const voiceInput = document.getElementById(`pending-voice-${index}`).value;
  const triggerType = document.getElementById(`pending-trigger-type-${index}`).value;
  const triggerFile = document.getElementById(`trigger-file-pending-${index}`).files[0];

  if (!questionInput || !responseInput) {
    alert('Please fill out both question and AI response.');
    return;
  }

  // Generate filename for audio
  const filename = `response_${Date.now()}.mp3`;

  // Save TTS audio
  try {
    await fetch('/.netlify/functions/saveTTS', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: responseInput,
        voice: voiceInput,
        filename: filename
      })
    });
  } catch (error) {
    console.error('TTS save error:', error);
    alert('Audio save failed.');
    return;
  }

  // Add to hardcodedResponses
  hardcodedResponses.push({
    userQuestion: questionInput,
    aiResponse: responseInput,
    role: roleInput,
    voice: voiceInput,
    audioFile: `./audio/${filename}`
  });
  hardcodesRef.set(hardcodedResponses);

  // Handle trigger if exists
  if (triggerType && triggerFile) {
    const reader = new FileReader();
    reader.onload = function(event) {
      triggers.push({
        pattern: questionInput,
        type: triggerType,
        filename: triggerFile.name,
        fileData: event.target.result
      });
      triggersRef.set(triggers);
    };
    reader.readAsDataURL(triggerFile);
  }

  // Remove from unknownQuestions
  unknownQuestions.splice(index, 1);
  unknownsRef.set(unknownQuestions);

  displayPendingUnknowns();
  displayApprovedHardcoded();
}

// ========= Delete Unknown =========
function deleteUnknown(index) {
  unknownQuestions.splice(index, 1);
  unknownsRef.set(unknownQuestions);
  displayPendingUnknowns();
}

// ========= Download Hardcoded Chat Log =========
function downloadHardcoded() {
  const blob = new Blob([JSON.stringify(hardcodedResponses, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'chat_log.json';
  link.click();
}

// ========= Clear Unknown Questions =========
function clearUnknowns() {
  if (confirm('Are you sure you want to clear all pending unknown questions?')) {
    unknownQuestions = [];
    unknownsRef.set([]);
    displayPendingUnknowns();
  }
}
