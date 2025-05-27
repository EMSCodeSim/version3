const { OpenAI } = require("openai");
const openai = new OpenAI();

exports.handler = async (event) => {
  const { userInput, answer } = JSON.parse(event.body);

  const systemPrompt = `
You are an EMS grading assistant. Given a user input and AI-generated answer, return a single JSON object with the following fields:

- "tags": 1–3 keywords
- "skillSheetID": use the format EMT-B-MED-## based on the official NREMT medical skill sheet step the action fulfills (e.g., EMT-B-MED-19 for taking pulse). If unsure, return null.
- "scoreCategory": e.g., Vitals, Treatment, Assessment
- "points": a number from 0–2
- "criticalFail": true or false

Only return a valid JSON object. Do not explain. Do not wrap in code blocks.
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
