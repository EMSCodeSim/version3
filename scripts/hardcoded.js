document.addEventListener('DOMContentLoaded', () => {
  const logRef = firebase.database().ref('unknownQuestions');
  const hardcodedRef = firebase.database().ref('hardcodedResponses');

  const table = document.getElementById('hardcode-table');
  const saveBtn = document.getElementById('save-button');
  const refreshBtn = document.getElementById('refresh-button');

  let editingRow = null;

  refreshBtn.addEventListener('click', loadUnapproved);

  saveBtn.addEventListener('click', () => {
    const userQuestion = document.getElementById('user-question').value.trim();
    const aiResponse = document.getElementById('ai-response').value.trim();
    const role = document.getElementById('response-role').value;
    const mediaTrigger = document.getElementById('media-trigger').value.trim();

    if (!userQuestion || !aiResponse) {
      alert('Question and response are required.');
      return;
    }

    const entry = {
      userQuestion,
      aiResponse,
      role,
      reviewed: true,
      timestamp: Date.now()
    };

    if (mediaTrigger) {
      entry.mediaTrigger = mediaTrigger;
    }

    // Save to hardcoded responses
    hardcodedRef.push(entry);

    // Mark as reviewed
    if (editingRow?.logKey) {
      logRef.child(editingRow.logKey).update({ reviewed: true });
    }

    clearForm();
    loadUnapproved();
  });

  function clearForm() {
    document.getElementById('user-question').value = '';
    document.getElementById('ai-response').value = '';
    document.getElementById('media-trigger').value = '';
    document.getElementById('response-role').value = 'patient';
    editingRow = null;
  }

  function loadUnapproved() {
    table.innerHTML = '';
    logRef.orderByChild('reviewed').equalTo(false).once('value', snapshot => {
      snapshot.forEach(child => {
        const data = child.val();
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${data.userQuestion}</td>
          <td>${data.aiResponse}</td>
          <td>${data.role}</td>
          <td>
            <button class="edit-btn">Edit</button>
          </td>
        `;
        row.querySelector('.edit-btn').addEventListener('click', () => {
          document.getElementById('user-question').value = data.userQuestion || '';
          document.getElementById('ai-response').value = data.aiResponse || '';
          document.getElementById('response-role').value = data.role || 'patient';
          document.getElementById('media-trigger').value = data.mediaTrigger || '';
          editingRow = { logKey: child.key };
        });
        table.appendChild(row);
      });
    });
  }

  loadUnapproved();
});
