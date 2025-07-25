// admin_home.js (Updated with edit/delete and duplicate check support)

const dataURLs = [
  'https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part1.json',
  'https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part2.json',
  'https://emscodesim3.netlify.app/scenarios/chest_pain_002/ems_database_part3.json'
];

let allEntries = {};

window.onload = async () => {
  document.getElementById('statusBox').innerText = 'Loading...';

  for (const url of dataURLs) {
    try {
      const res = await fetch(url);
      const json = await res.json();
      Object.assign(allEntries, json);
    } catch (err) {
      console.error(`Error loading ${url}`, err);
    }
  }

  document.getElementById('statusBox').innerText = `Loaded ${Object.keys(allEntries).length} total entries.`;
  renderEntries();
  addDuplicateCheckButton();
};

function renderEntries() {
  const container = document.getElementById('entryContainer');
  container.innerHTML = '';

  Object.entries(allEntries).forEach(([id, entry]) => {
    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML = `
      <p><strong>Question:</strong> <input type="text" value="${entry.question}" id="q_${id}" /></p>
      <p><strong>Answer:</strong> <input type="text" value="${entry.answer}" id="a_${id}" style="width: 90%" /></p>
      <button onclick="updateEntry('${id}')">Update</button>
      <button onclick="deleteEntry('${id}')">Delete</button>
    `;
    container.appendChild(div);
  });
}

function updateEntry(id) {
  const updatedQ = document.getElementById(`q_${id}`).value;
  const updatedA = document.getElementById(`a_${id}`).value;
  allEntries[id].question = updatedQ;
  allEntries[id].answer = updatedA;
  alert(`Entry ${id} updated.`);
}

function deleteEntry(id) {
  if (confirm(`Delete entry ${id}?`)) {
    delete allEntries[id];
    renderEntries();
  }
}

function addDuplicateCheckButton() {
  const btn = document.createElement('button');
  btn.innerText = 'Check & Remove Duplicate Questions';
  btn.onclick = () => {
    const seen = new Set();
    const duplicates = [];

    for (const [id, entry] of Object.entries(allEntries)) {
      const key = entry.question.toLowerCase().trim();
      if (seen.has(key)) {
        duplicates.push(id);
      } else {
        seen.add(key);
      }
    }

    duplicates.forEach((id) => delete allEntries[id]);
    alert(`Removed ${duplicates.length} duplicate entries.`);
    renderEntries();
    document.getElementById('statusBox').innerText = `Loaded ${Object.keys(allEntries).length} total entries after removing duplicates.`;
  };

  document.body.insertBefore(btn, document.getElementById('entryContainer'));
}
