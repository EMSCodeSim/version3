let unknownQuestions = JSON.parse(localStorage.getItem('unknownQuestions')) || [];
let hardcodedResponses = JSON.parse(localStorage.getItem('hardcodedResponses')) || [];

// ========= Load Hardcoded Chat Log at Start =========
fetch('./scenarios/chest_pain_002/chat_log.json')
  .then(response => response.json())
  .then(data => {
    // Merge existing saved localStorage hardcodes if any
    if (hardcodedResponses.length === 0) {
      hardcodedResponses = data;
    }
    displayPendingUnknowns();
    displayApprovedHardcoded();
  })
  .catch(error => {
    console.error('Failed to load hardcoded chat log.');
    displayPendingUnknowns();
    displayApprovedHardcoded();
  });

// ========= Display Pending Unknown Questions =========
function displayPendingUnknowns() {
  const pendingDiv = document.getElementById('pending-list');
  pendingDiv.innerHTML = '';

  if (unknownQuestions.length === 0) {
    pendingDiv.innerHTML = '<p>No unknown questions pending approval.</p>';
    return;
  }

  unknownQuestions.forEach((item, index) => {
    const container = document.createElement('div');
    container.style.borderBottom = "1px solid #ccc";
    container.style.paddingBottom = "10px";
    container.style.marginBottom = "10px";

    container.innerHTML = `
      <label>Question:</label>
      <input type="text" value="${item.userQuestion}" id="question-${index}">
      <label>AI Response:</label>
      <textarea id="response-${index}" placeholder="Enter AI response here...">${item.aiResponse}</textarea>
      <label>Role:</label>
      <select id="role-${index}">
        <option value="patient">Patient</option>
        <option value="proctor">Proctor</option>
      </select>
      <label>Optional Trigger Keyword:</label>
      <input type="text" id="trigger-${index}" placeholder="e.g., breath sounds, BP check">
      <button onclick="approveUnknown(${index})">Approve and Add</button>
    `;

    pendingDiv.appendChild(container);
  });
}

// ========= Approve Unknown =========
function approveUnknown(index) {
  const questionInput = document.getElementById(`question-${index}`).value.trim();
  const responseInput = document.getElementById(`response-${index}`).value.trim();
  const roleSelect = document.getElementById(`role-${index}`).value;
  const triggerInput = document.getElementById(`trigger-${index}`).value.trim();

  if (!questionInput || !responseInput) {
    alert('Please fill in both the question and the AI response.');
    return;
  }

  // Push approved entry into live hardcodedResponses memory
  hardcodedResponses.push({
    userQuestion: questionInput,
    aiResponse: responseInput,
    role: roleSelect
  });

  // Save live merged hardcodedResponses to localStorage
  localStorage.setItem('hardcodedResponses', JSON.stringify(hardcodedResponses));

  // Optionally save new trigger
  if (triggerInput) {
    let currentTriggers = JSON.parse(localStorage.getItem('triggers')) || [];
    currentTriggers.push({ pattern: triggerInput, actions: ["play_breath_sounds"] });
    localStorage.setItem('triggers', JSON.stringify(currentTriggers));
  }

  // Remove from pending unknowns
  unknownQuestions.splice(index, 1);
  localStorage.setItem('unknownQuestions', JSON.stringify(unknownQuestions));

  displayPendingUnknowns();
  displayApprovedHardcoded();

  alert('Approved and merged into hardcoded memory!');
}

// ========= Display Approved Hardcoded =========
function displayApprovedHardcoded() {
  const approvedDiv = document.getElementById('approved-list');
  approvedDiv.innerHTML = '';

  hardcodedResponses.forEach((item, index) => {
    const container = document.createElement('div');
    container.style.borderBottom = "1px solid #ccc";
    container.style.paddingBottom = "5px";
    container.style.marginBottom = "5px";

    container.innerHTML = `
      <strong>Q:</strong> ${item.userQuestion}<br>
      <strong>A:</strong> ${item.aiResponse}<br>
      <strong>Role:</strong> ${item.role}
    `;
    approvedDiv.appendChild(container);
  });
}

// ========= Download Hardcoded Responses =========
function downloadHardcoded() {
  const blob = new Blob([JSON.stringify(hardcodedResponses, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'chat_log.json';
  link.click();
}

// ========= Clear All Pending Unknowns =========
function clearUnknowns() {
  if (confirm('Are you sure you want to clear ALL pending unknown questions?')) {
    unknownQuestions = [];
    localStorage.setItem('unknownQuestions', JSON.stringify(unknownQuestions));
    displayPendingUnknowns();
    alert('Pending unknown questions cleared.');
  }
}
