import { handleGpt4Turbo } from './netlify/functions/gpt4-turbo';
import { searchVectorDB } from './netlify/functions/vector-search';
import { rephraseWithGPT35 } from './netlify/functions/gpt3_rephrase';

const chatLog = document.getElementById('chat-log');
const inputField = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Hardcoded responses
import hardcoded from './hardcoded_responses.json';

function displayMessage(message, sender, tag = "") {
  const div = document.createElement('div');
  div.className = sender;
  div.innerHTML = `<strong>${sender} ${tag ? `(${tag})` : ''}:</strong> ${message}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function findHardcodedMatch(input) {
  const cleanedInput = input.trim().toLowerCase();
  return hardcoded[cleanedInput] || null;
}

// Rephrase using GPT-3.5
async function rephraseWithGPT35(input) {
  try {
    console.log("Calling rephrase...");
    const res = await fetch('/.netlify/functions/gpt3_rephrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });
    const data = await res.json();
    return data.rephrased || null;
  } catch (e) {
    console.error("❌ GPT-3.5 rephrase failed:", e);
    return null;
  }
}

// Vector similarity search
async function searchVector(input) {
  try {
    const res = await fetch('/.netlify/functions/vector-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: input })
    });
    const data = await res.json();
    return data.result || null;
  } catch (e) {
    console.error("❌ Vector search failed:", e);
    return null;
  }
}

// GPT-4 Turbo fallback
async function fallbackGPT(input) {
  try {
    const res = await fetch('/.netlify/functions/gpt4-turbo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });
    const data = await res.json();
    return data.reply || null;
  } catch (e) {
    console.error("❌ GPT-4 Turbo failed:", e);
    return null;
  }
}

// Full AI logic
async function processInput(userInput) {
  displayMessage(userInput, 'You');

  // 1. Hardcoded match
  const hardcoded = findHardcodedMatch(userInput);
  if (hardcoded) {
    displayMessage(hardcoded, 'Patient', 'hardcoded');
    return;
  }

  // 2. Rephrase
  const rephrased = await rephraseWithGPT35(userInput);
  if (rephrased) {
    const reHardcoded = findHardcodedMatch(rephrased);
    if (reHardcoded) {
      displayMessage(reHardcoded, 'Patient', 'rephrased');
      return;
    }
  }

  // 3. Vector search
  const vectorMatch = await searchVector(userInput);
  if (vectorMatch) {
    displayMessage(vectorMatch, 'Patient', 'vector');
    return;
  }

  // 4. GPT-4 Turbo fallback
  const gptResponse = await fallbackGPT(userInput);
  if (gptResponse) {
    displayMessage(gptResponse, 'Patient', 'chatgpt');
    return;
  }

  displayMessage("AI response failed. Try again.", 'System');
}

// UI Event Handling
sendButton.addEventListener('click', () => {
  const input = inputField.value.trim();
  if (!input) return;
  inputField.value = '';
  processInput(input);
});
