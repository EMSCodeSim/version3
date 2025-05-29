import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { question, response } = JSON.parse(event.body);

    const basePrompt = `
You are an expert NREMT evaluator. Tag this student response using:
1. General tags (e.g., OPQRST, SAMPLE, Vitals)
2. Specific NREMT medical assessment skill sheet line item (called scoreCategory)
3. Whether it is a critical failure.

Return in this exact JSON format:
{
  "tags": [...],
  "scoreCategory": "...",
  "criticalFail": true/false
}

Only use official score sheet lines for scoreCategory. If not sure, leave it blank. Here is the entry:

QUESTION: ${question}
RESPONSE: ${response}
`;

    let result;

    // First try with GPT-3.5
    const gpt3 = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: basePrompt }],
    });

    try {
      result = JSON.parse(gpt3.choices[0].message.content);
    } catch {
      // Escalate to GPT-4
      const gpt4 = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: basePrompt }],
      });
      result = JSON.parse(gpt4.choices[0].message.content);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("GPT tagging error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Failed to tag" }),
    };
  }
}
