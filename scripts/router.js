import { searchVector } from './vector_search.js';
import { getHardcodedResponse } from './hardcoded.js';
import { callGpt4Turbo } from './gpt4-turbo.js';

const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

sendButton.addEventListener('click', handleUserMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleUserMessage();
});

async function handleUserMessage() {
  const inputText = userInput.value.trim();
  if (!inputText) return;

  // Display user message immediately
  addUserMessage(inputText);
  userInput.value = '';

  // Try hardcoded response
  const hardcoded = getHardcodedResponse(inputText);
  if (hardcoded) {
    displayChatResponse(hardcoded, 'patient', 'hardcoded');
    return;
  }

  // Try vector search
  try {
    const vectorMatch = await searchVector(inputText);
    if (vectorMatch && vectorMatch.confidence > 0.85) {
      displayChatResponse(vectorMatch.answer, 'patient', 'vector');
      return;
    }
  } catch (err) {
    console.warn('Vector search failed:', err);
  }

  // Fallback to GPT-4 Turbo
  try {
    const gptResponse = await callGpt4Turbo(inputText);
    if (gptResponse) {
      displayChatResponse(gptResponse, 'patient', 'gpt4');
    } else {
      displayChatResponse('AI response failed. Try again.', 'system', 'error');
    }
  } catch (err) {
    console.error('GPT fallback failed:', err);
    displayChatResponse('AI response failed. Try again.', 'system', 'error');
  }
}

function addUserMessage(message) {
  const chat = document.getElementById('chat');
  const div = document.createElement('div');
  div.className = 'user-message';
  div.innerHTML = `<strong>You:</strong> ${message}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function displayChatResponse(message, sender, type) {
  const chat = document.getElementById('chat');
  const div = document.createElement('div');
  div.className = type === 'error' ? 'error-message' : `${sender}-message`;

  const label = sender === 'patient' 
    ? type === 'hardcoded' ? 'Patient (hardcoded):' 
      : type === 'vector' ? 'Patient (vector):' 
      : 'Patient (GPT-4 Turbo):'
    : sender === 'proctor' ? 'Proctor:' 
    : 'System:';

  div.innerHTML = `<strong>${label}</strong> ${message}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}
