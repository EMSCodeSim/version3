// gpt_fallback.js

import { saveToHardcodeApprovalQueue } from './hardcode_logger.js';

export async function getGPTResponse(cleanInput, context = {}) {
  const apiKey = process.env.OPENAI_API_KEY;

  const payload = {
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: "You are simulating a realistic EMS patient or NREMT proctor. Respond in character based on context. Do not explain procedures unless asked. Be brief, accurate, and realistic."
      },
      {
        role: "user",
        content: cleanInput
      }
    ],
    temperature: 0.4,
    max_tokens: 150
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  const gptReply = data.choices?.[0]?.message?.content?.trim() || "I'm not sure how to respond to that.";

  // Log for future hardcoding
  await saveToHardcodeApprovalQueue(cleanInput, gptReply, context);

  return gptReply;
}
