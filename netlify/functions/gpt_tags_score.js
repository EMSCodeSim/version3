const { OpenAI } = require("openai");
const openai = new OpenAI();

exports.handler = async (event) => {
  const { userInput, answer } = JSON.parse(event.body);

  const systemPrompt = `
You are an EMS grading assistant. Given a user input and AI-generated answer, return a single JSON object with the following fields:

- "tags": 1–3 keywords
- "skillSheetID": use the format EMT-B-MED-## based on the official NREMT EMT-Basic Medical Assessment Skill Sheet. If unsure, return null.
- "scoreCategory": e.g., Vitals, Treatment, Assessment
- "points": a number from 0–2
- "criticalFail": true or false

Respond ONLY with a JSON object. Do not explain. Do not use code blocks.

Example 1:
Input: I check the patient's pulse
Answer: You feel a regular radial pulse at 92 bpm.
Response:
{
  "tags": ["pulse", "vitals"],
  "skillSheetID": "EMT-B-MED-19",
  "scoreCategory": "Vitals",
  "points": 1,
  "criticalFail": false
}

Example 2:
Input: I give 4 baby aspirin
Answer: 324 mg of aspirin given orally.
Response:
{
  "tags": ["aspirin", "medication"],
  "skillSheetID": "EMT-B-MED-37",
  "scoreCategory": "Treatment",
  "points": 1,
  "criticalFail": false
}
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
