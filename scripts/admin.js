let unknownQuestions = JSON.parse(localStorage.getItem('unknownQuestions')) || [];
let hardcodedResponses = JSON.parse(localStorage.getItem('hardcodedResponses')) || [];

// ========= Load Hardcoded Chat Log at Start =========
fetch('./scenarios/chest_pain_002/chat_log.json')
  .then(response => response.json())
  .then(serverData => {
    if (hardcodedResponses.length === 0) {
      hardcodedResponses = serverData;
    } else {
      hardcodedResponses = mergeHardcodedResponses(serverData, hardcodedResponses);
    }
    displayPendingUnknowns();
    displayApprovedHardcoded();
  })
  .catch(error => {
    console.error('Failed to load hardcoded chat log.');
    displayPendingUnknowns();
    displayApprovedHardcoded();
  });

// ========= Merge server + local Hardcoded =========
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
      <input type="text" value="${item.userQuestion}" id="pending-question-${index}">
      <label>AI Response:</label>
      <textarea id="pending-response-${index}" placeholder="Enter AI response...">${item.aiResponse}</textarea>
      <label>Role:</label>
      <select id="pending-role-${index}">
        <option value="patient">Patient</option>
        <option value="proctor">Proctor</option>
      </select>
      <label>Trigger Type:</label>
      <select id="pending-trigger-type-${index}" onchange="showUploadField(${index})">
        <option value="">None</option>
        <option value="photo">Photo</option>
        <option value="audio">Audio</option>
        <option value="app">App</option>
      </select>
      <div id="upload-field-${index}" style="display:none;">
        <label>Upload File:</label>
        <input type="file" id="trigger-file-${index}">
      </div>
      <button onclick="approveUnknown(${index})">Approve and Add</button>
    `;

    pendingDiv.appendChild(container);
  });
}

// ========= Show Upload Field if Trigger Selected =========
function showUploadField(index) {
  const triggerType = document.getElementById(`pending-trigger-type-${index}`).value;
  const uploadField = document.getElementById(`upload-field-${index}`);
  if (triggerType) {
    uploadField.style.display = 'block';
  } else {
    uploadField.style.display = 'none';
  }
}

// ========= Approve Unknown =========
function approveUnknown(index) {
  const questionInput = document.getElementById(`pending-question-${index}`).value.trim();
  const responseInput = document.getElementById(`pending-response-${index}`).value.trim();
  const roleSelect = document.getElementById(`pending-role-${index}`).value;
  const triggerType = document.getElementById(`pending-trigger-type-${index}`).value;
  const triggerFile = document.getElementById(`trigger-file-${index}`).files[0];

  if (!questionInput || !responseInput) {
    alert('Please fill in both the question and the AI response.');
    return;
  }

  hardcodedResponses.push({
    userQuestion: questionInput,
    aiResponse: responseInput,
    role: roleSelect
  });

  localStorage.setItem('hardcodedResponses', JSON.stringify(hardcodedResponses));

  if (triggerType && triggerFile) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const triggerData = JSON.parse(localStorage.getItem('triggers')) || [];
      triggerData.push({
        pattern: questionInput,
        type: triggerType,
        filename: triggerFile.name,
        fileData: event.target.result
      });
      localStorage.setItem('triggers', JSON.stringify(triggerData));
    };
    reader.readAsDataURL(triggerFile);
  }

  unknownQuestions.splice(index, 1);
  localStorage.setItem('unknownQuestions', JSON.stringify(unknownQuestions));

  displayPendingUnknowns();
  displayApprovedHardcoded();
}

// ========= Display Approved Hardcoded =========
function displayApprovedHardcoded() {
  const approvedDiv = document.getElementById('approved-list');
  approvedDiv.innerHTML = '';

  hardcodedResponses.forEach((item, index) => {
    const container = document.createElement('div');
    container.style.borderBottom = "1px solid #ccc";
    container.style.paddingBottom = "10px";
    container.style.marginBottom = "10px";

    container.innerHTML = `
      <label>Question:</label>
      <input type="text" value="${item.userQuestion}" id="approved-question-${index}" onchange="editHardcoded(${index}, 'userQuestion')">
      <label>AI Response:</label>
      <textarea id="approved-response-${index}" onchange="editHardcoded(${index}, 'aiResponse')">${item.aiResponse}</textarea>
      <label>Role:</label>
      <select id="approved-role-${index}" onchange="editHardcoded(${index}, 'role')">
        <option value="patient" ${item.role === 'patient' ? 'selected' : ''}>Patient</option>
        <option value="proctor" ${item.role === 'proctor' ? 'selected' : ''}>Proctor</option>
      </select>
    `;

    approvedDiv.appendChild(container);
  });
}

// ========= Edit Approved Hardcoded Live =========
function editHardcoded(index, field) {
  if (field === 'userQuestion') {
    hardcodedResponses[index].userQuestion = document.getElementById(`approved-question-${index}`).value.trim();
  }
  if (field === 'aiResponse') {
    hardcodedResponses[index].aiResponse = document.getElementById(`approved-response-${index}`).value.trim();
  }
  if (field === 'role') {
    hardcodedResponses[index].role = document.getElementById(`approved-role-${index}`).value;
  }
  localStorage.setItem('hardcodedResponses', JSON.stringify(hardcodedResponses));
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
