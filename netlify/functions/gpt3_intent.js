import { OpenAI } from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  try {
    const { message } = JSON.parse(event.body);

    const prompt = `
You're an EMS trainer. Convert the question below into a single keyword intent for routing.

Examples:
"can I give aspirin?" → aspirin
"do I check eyes?" → pupils
"is nitro okay now?" → nitro
"what is the BP?" → vitals

Return ONLY the keyword.

Input: "${message}"
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    const intent = response.choices[0].message.content.trim().toLowerCase();
    return {
      statusCode: 200,
      body: JSON.stringify({ intent })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to classify intent", detail: err.message })
    };
  }
}
