// File: generate_gpt_readme.js

const fs = require('fs');
const path = require('path');

// Generate readme contents
const content = `
PROJECT NAME: EMS Code Sim
MAIN PURPOSE:
Simulates NREMT patient scenarios using a mix of hardcoded logic, vector similarity search, and AI fallback (GPT-4 Turbo).

KEY FILES:
- /index.html ................. Main UI and layout
- /scripts/app.js ............. Handles scenario logic, patient interaction, and GPT calls
- /netlify/functions/gpt4-turbo.js .... Local fallback AI response
- /netlify/functions/vector-search.js . Local similarity fallback
- /scenarios/<name>/ .......... Contains scenario-specific dispatch.txt, patient.txt, media, etc.
- /netlify.toml ............... Contains redirect rules for API routing

AI MESSAGE FLOW:
1. User types a message ➝
2. app.js checks for hardcodedResponses
3. If not found ➝ calls /api/vector-search
4. If still no match ➝ calls /api/gpt4-turbo (patientContext is included)
5. Response is displayed in #chat-box
6. All AI responses are logged in Firebase for review/hardcoding

LAST UPDATED: ${new Date().toLocaleString()}
`;

fs.writeFileSync(path.join(__dirname, 'GPT_README.txt'), content);
console.log('✅ GPT_README.txt has been updated.');
