const { OpenAI } = require("openai");
const openai = new OpenAI();

exports.handler = async (event) => {
  const { userInput, answer } = JSON.parse(event.body);

  const systemPrompt = `
You are an EMS grading assistant. Given a user input and AI-generated answer, return a single JSON object with the following fields:
- "tags": 1–3 keywords
- "skillSheetID": the NREMT skill ID (or null if unknown)
- "scoreCategory": e.g., Vitals, Treatment, Assessment
- "points": a number from 0–2
- "criticalFail": true or false

Only return a valid JSON object.
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0125",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Input: ${userInput}\nAnswer: ${answer}` }
    ]
  });

  return {
    statusCode: 200,
    body: completion.choices[0].message.content.trim()
  };
};
