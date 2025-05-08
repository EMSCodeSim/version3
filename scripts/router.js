// router.js

import { handleHardcodedMatch } from './hardcoded.js';
import { runVectorSearch } from './vector.js';
import { getGPT4TurboResponse } from '../functions/gpt4-turbo.js';

const chatBox = document.getElementById('chat-box');

export async function processInput(input) {
  appendUserMessage(input);

  // 1. Try Hardcoded Match
  const hardcoded = await handleHardcodedMatch(input);
  if (hardcoded) {
    appendBotMessage(hardcoded.answer, 'hardcoded');
    return;
  }

  // 2. Try Rephrase
  let rephrased = '';
  try {
    console.log("Rephrasing input with GPT-3.5:", input); // for debugging
    const res = await fetch('/.netlify/functions/gpt3_rephrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });
    const data = await res.json();
    if (data?.rephrased) {
      rephrased = data.rephrased;
      appendBotMessage(rephrased, 'rephrase');
      return;
    }
  } catch (err) {
    console.error('Rephrase error:', err);
  }

  // 3. Try Vector Search
  try {
    const vectorResult = await runVectorSearch(input);
    if (vectorResult?.answer) {
      appendBotMessage(vectorResult.answer, 'vector');
      return;
    }
  } catch (err) {
    console.error('Vector search error:', err);
  }

  // 4. Fallback to GPT-4 Turbo
  try {
    const gptResponse = await getGPT4TurboResponse(input);
    appendBotMessage(gptResponse, 'gpt4');
  } catch (err) {
    appendBotMessage('AI response failed. Try again.', 'error');
    console.error('GPT-4 Turbo error:', err);
  }
}

function appendUserMessage(text) {
  const message = document.createElement('div');
  message.className = 'message user';
  message.innerText = `You: ${text}`;
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendBotMessage(text, tag = '') {
  const message = document.createElement('div');
  message.className = 'message bot';
  message.innerHTML = `Patient${tag ? ` <span class="tag">(${tag})</span>` : ''}: ${text}`;
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
}
