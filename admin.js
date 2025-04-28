// ========== Admin Trigger Management ==========
let triggers = JSON.parse(localStorage.getItem('triggers')) || [];
let editingTriggerIndex = -1;

function addOrUpdateTrigger() {
  const patternInput = document.getElementById('trigger-pattern');
  const actionsInput = document.getElementById('trigger-actions');
  const pattern = patternInput.value.trim();
  const actions = actionsInput.value.split(',').map(a => a.trim()).filter(a => a !== '');

  if (pattern && actions.length > 0) {
    if (editingTriggerIndex > -1) {
      triggers[editingTriggerIndex] = { pattern, actions };
      editingTriggerIndex = -1;
    } else {
      triggers.push({ pattern, actions });
    }
    localStorage.setItem('triggers', JSON.stringify(triggers));
    patternInput.value = '';
    actionsInput.value = '';
    renderTriggers();
  }
}

function renderTriggers() {
  const triggerList = document.getElementById('trigger-list');
  triggerList.innerHTML = '<h3>Current Triggers:</h3>';
  triggers.forEach((trigger, index) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>When user says:</strong> "${trigger.pattern}"<br>
        <strong>Trigger actions:</strong> ${trigger.actions.join(', ')}<br>
        <button onclick="editTrigger(${index})">Edit</button>
        <button onclick="deleteTrigger(${index})">Delete</button>
      </div>
    `;
    triggerList.appendChild(div);
  });
}

function editTrigger(index) {
  const trigger = triggers[index];
  document.getElementById('trigger-pattern').value = trigger.pattern;
  document.getElementById('trigger-actions').value = trigger.actions.join(', ');
  editingTriggerIndex = index;
}

function deleteTrigger(index) {
  triggers.splice(index, 1);
  localStorage.setItem('triggers', JSON.stringify(triggers));
  renderTriggers();
}

// Render on page load
if (document.getElementById('trigger-manager')) {
  renderTriggers();
}
