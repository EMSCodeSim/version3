import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  const { transcript } = JSON.parse(event.body);

  const prompt = `
Analyze this EMS simulation transcript. Provide:
1. Timeline summary of key actions (ordered by time)
2. Missed critical steps (list only real omissions)
3. 2–3 improvement tips based on performance

Transcript:
` + transcript;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: "You are an EMS simulation evaluator." },
      { role: "user", content: prompt }
    ]
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ result: response.choices[0].message.content })
  };
}
