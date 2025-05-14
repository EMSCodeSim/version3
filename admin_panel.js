const db = firebase.database();
let currentTab = 'approved';

function switchTab(tab) {
  currentTab = tab;
  document.getElementById("tab-approved").classList.toggle("active", tab === 'approved');
  document.getElementById("tab-review").classList.toggle("active", tab === 'review');
  loadResponses();
}

function loadResponses() {
  const container = document.getElementById("responsesContainer");
  const path = currentTab === 'review' ? 'hardcodeReview' : 'hardcodedResponses';
  db.ref(path).once('value').then(snapshot => {
    container.innerHTML = '';
    snapshot.forEach(child => {
      const key = child.key;
      const data = child.val();
      const question = data.question || data.userQuestion || '';
      const response = data.response || data.aiResponse || '';
      const role = data.role || 'Patient';
      const ttsAudio = data.ttsAudio || '';

      const div = document.createElement('div');
      div.className = 'response';
      div.innerHTML = `
        <strong>Q:</strong> ${question}<br>
        <textarea id="resp-${key}">${response}</textarea>
        <select id="role-${key}">
          <option value="Patient" ${role === 'Patient' ? 'selected' : ''}>Patient</option>
          <option value="Proctor" ${role === 'Proctor' ? 'selected' : ''}>Proctor</option>
        </select>
        ${ttsAudio ? `<br><audio controls src="data:audio/mp3;base64,${ttsAudio}"></audio>` : ''}
        <br><button onclick="playTTSPreview('${key}')">▶ Preview TTS</button>
        ${currentTab === 'review'
          ? `<button onclick="approveEntry('${key}', \`${question.replace(/`/g, '\\`')}\`)">✅ Approve</button>
             <button onclick="deleteEntry('${path}', '${key}')">🗑 Delete</button>`
          : `<button onclick="saveEntry('${key}')">💾 Save</button>
             <button onclick="deleteEntry('${path}', '${key}')">🗑 Delete</button>`}
      `;
      container.appendChild(div);
    });
  });
}

async function playTTSPreview(key) {
  const response = document.getElementById(`resp-${key}`).value;
  const role = document.getElementById(`role-${key}`).value;
  const res = await fetch('/.netlify/functions/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: response, speaker: role.toLowerCase() })
  });
  const json = await res.json();
  const audio = new Audio(`data:audio/mp3;base64,${json.audio}`);
  audio.play();
}

async function approveEntry(key, question) {
  const response = document.getElementById(`resp-${key}`).value;
  const role = document.getElementById(`role-${key}`).value;
  const res = await fetch('/.netlify/functions/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: response, speaker: role.toLowerCase() })
  });
  const json = await res.json();
  await db.ref('hardcodedResponses').push({
    question, response, role, ttsAudio: json.audio
  });
  await db.ref(`hardcodeReview/${key}`).remove();
  loadResponses();
}

async function saveEntry(key) {
  const response = document.getElementById(`resp-${key}`).value;
  const role = document.getElementById(`role-${key}`).value;
  const res = await fetch('/.netlify/functions/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: response, speaker: role.toLowerCase() })
  });
  const json = await res.json();
  await db.ref(`hardcodedResponses/${key}`).update({ response, role, ttsAudio: json.audio });
  alert('Saved');
  loadResponses();
}

function deleteEntry(path, key) {
  db.ref(`${path}/${key}`).remove().then(loadResponses);
}

function upgradeMissingTTS() {
  db.ref('hardcodedResponses').once('value').then(snapshot => {
    snapshot.forEach(child => {
      const key = child.key;
      const val = child.val();
      if (!val.ttsAudio && val.response) {
        fetch('/.netlify/functions/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: val.response, speaker: (val.role || 'patient').toLowerCase() })
        })
        .then(res => res.json())
        .then(json => {
          db.ref(`hardcodedResponses/${key}/ttsAudio`).set(json.audio);
        });
      }
    });
  });
}

switchTab('review');
