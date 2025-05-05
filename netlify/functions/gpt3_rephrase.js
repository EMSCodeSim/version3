import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event, context) {
  try {
    const { message } = JSON.parse(event.body);

    const prompt = `Rephrase this EMS student question to its most basic version:\n"${message}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const rephrased = completion.choices[0].message.content.trim();

    return {
      statusCode: 200,
      body: JSON.stringify({ rephrased })
    };

  } catch (err) {
    console.error("GPT-3.5 rephrase failed:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Rephrase failed", message: err.message })
    };
  }
}
